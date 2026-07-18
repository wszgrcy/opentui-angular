import {
  Service,
  OnDestroy,
  inject,
  ApplicationRef,
  NgZone,
  ɵChangeDetectionScheduler,
  ɵPendingTasksInternal,
  ɵINTERNAL_APPLICATION_ERROR_HANDLER,
  ɵTracingService,
} from '@angular/core';
import { Subscription } from 'rxjs';

const CONSECUTIVE_MICROTASK_NOTIFICATION_LIMIT = 100;
let consecutiveMicrotaskNotifications = 0;
const stackFromLastFewNotifications: string[] = [];

function trackMicrotaskNotificationForDebugging() {
  consecutiveMicrotaskNotifications++;
  if (CONSECUTIVE_MICROTASK_NOTIFICATION_LIMIT - consecutiveMicrotaskNotifications < 5) {
    const stack = new Error().stack;
    if (stack) {
      stackFromLastFewNotifications.push(stack);
    }
  }

  if (consecutiveMicrotaskNotifications === CONSECUTIVE_MICROTASK_NOTIFICATION_LIMIT) {
    throw new RuntimeError(
      RuntimeErrorCode.INFINITE_CHANGE_DETECTION,
      'Angular could not stabilize because there were endless change notifications within the browser event loop. ' +
        'The stack from the last several notifications: \n' +
        stackFromLastFewNotifications.join('\n'),
    );
  }
}

@Service()
export class ChangeDetectionSchedulerImpl implements ɵChangeDetectionScheduler, OnDestroy {
  private readonly applicationErrorHandler = inject(ɵINTERNAL_APPLICATION_ERROR_HANDLER);
  private readonly appRef = inject(ApplicationRef);
  private readonly taskService = inject(ɵPendingTasksInternal);
  private readonly ngZone = inject(NgZone);
  private readonly tracing = inject(ɵTracingService, { optional: true });
  private readonly schedulerTickApplyArgs = [{ data: { __scheduler_tick__: true } }];
  private readonly subscriptions = new Subscription();

  private cancelScheduledCallback: null | (() => void) = null;
  private useMicrotaskScheduler = false;
  runningTick = false;
  pendingRenderTaskId: number | null = null;

  constructor() {
    this.subscriptions.add(
      this.appRef.afterTick.subscribe(() => {
        // Prevent stabilization if cleanup causes the last task to be removed
        // before we can switch to the microtask scheduler.
        const task = this.taskService.add();
        // If the scheduler isn't running a tick but the application ticked, that means
        // someone called ApplicationRef.tick manually. In this case, we should cancel
        // any change detections that had been scheduled so we don't run an extra one.
        if (!this.runningTick) {
          this.cleanup();
          // Ticks that happen when ZoneJS is present do not get the microtask scheduling treatment.
          // ZoneJS is responsible for rerunning change detection on microtask queue empty.
          // Ticks initiated from tests also do not get microtask treatment so those ticks
          // do not affect stability timing, which tests are quite sensitive to.
          // TODO(atscott): we really should not use microtask scheduler
          // _ever_ when ZoneJS is enabled because ZoneJS is responsible for rerunning change
          // detection on microtask queue empty. This change breaks some tests
          if (this.appRef.includeAllTestViews) {
            this.taskService.remove(task);
            return;
          }
        }
        this.switchToMicrotaskScheduler();
        this.taskService.remove(task);
      }),
    );
    this.subscriptions.add(
      this.ngZone.onUnstable.subscribe(() => {
        // If the zone becomes unstable when we're not running tick (this happens from the zone.run),
        // we should cancel any scheduled change detection here because at this point we
        // know that the zone will stabilize at some point and run change detection itself.
        if (!this.runningTick) {
          this.cleanup();
        }
      }),
    );
  }

  // If we're notified of a change within 1 microtask of running change
  // detection, run another round in the same event loop. This allows code
  // which uses Promise.resolve (see NgModel) to avoid
  // ExpressionChanged...Error to still be reflected in a single browser
  // paint, even if that spans multiple rounds of change detection.
  private switchToMicrotaskScheduler(): void {
    this.ngZone.runOutsideAngular(() => {
      const task = this.taskService.add();
      this.useMicrotaskScheduler = true;
      queueMicrotask(() => {
        this.useMicrotaskScheduler = false;
        this.taskService.remove(task);
      });
    });
  }

  notify(source: NotificationSource): void {
    switch (source) {
      case NotificationSource.MarkAncestorsForTraversal:
      case NotificationSource.DeferBlockStateUpdate: {
        this.appRef.dirtyFlags |= ApplicationRefDirtyFlags.ViewTreeTraversal;
        break;
      }
      case NotificationSource.DebugApplyChanges:
      case NotificationSource.MarkForCheck:
      case NotificationSource.Listener:
      case NotificationSource.SetInput: {
        this.appRef.dirtyFlags |= ApplicationRefDirtyFlags.ViewTreeCheck;
        break;
      }
      case NotificationSource.CustomElement: {
        // We use `ViewTreeTraversal` to ensure we refresh the element even if this is triggered
        // during CD. In practice this is a no-op since the elements code also calls via a
        // `markForRefresh()` API which sends `NotificationSource.MarkAncestorsForTraversal` anyway.
        this.appRef.dirtyFlags |= ApplicationRefDirtyFlags.ViewTreeTraversal;
        break;
      }
      case NotificationSource.RootEffect: {
        this.appRef.dirtyFlags |= ApplicationRefDirtyFlags.RootEffects;
        break;
      }
      case NotificationSource.ViewEffect: {
        // This is technically a no-op, since view effects will also send a
        // `MarkAncestorsForTraversal` notification. Still, we set this for logical consistency.
        this.appRef.dirtyFlags |= ApplicationRefDirtyFlags.ViewTreeTraversal;
        break;
      }
      case NotificationSource.PendingTaskRemoved: {
        break;
      }
      case NotificationSource.ViewDetachedFromDOM:
      case NotificationSource.ViewAttached:
      case NotificationSource.RenderHook:
      case NotificationSource.AsyncAnimationsLoaded:
      default: {
        // These notifications only schedule a tick but do not change whether we should refresh
        // views. Instead, we only need to run render hooks unless another notification from the
        // other set is also received before `tick` happens.
        this.appRef.dirtyFlags |= ApplicationRefDirtyFlags.AfterRender;
      }
    }

    // If not already defined, attempt to capture a tracing snapshot of this
    // notification so that the resulting CD run can be attributed to the
    // context which produced the notification.
    this.appRef.tracingSnapshot = this.tracing?.snapshot(this.appRef.tracingSnapshot) ?? null;

    if (!this.shouldScheduleTick()) {
      return;
    }

    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      if (this.useMicrotaskScheduler) {
        trackMicrotaskNotificationForDebugging();
      } else {
        consecutiveMicrotaskNotifications = 0;
        stackFromLastFewNotifications.length = 0;
      }
    }

    const scheduleCallback = this.useMicrotaskScheduler
      ? scheduleCallbackWithMicrotask
      : scheduleCallbackWithRafRace;
    this.pendingRenderTaskId = this.taskService.add();

    this.cancelScheduledCallback = this.ngZone.runOutsideAngular(() =>
      scheduleCallback(() => this.tick()),
    );
  }

  private shouldScheduleTick(): boolean {
    if (this.appRef.destroyed) {
      return false;
    }
    // already scheduled or running
    if (this.pendingRenderTaskId !== null || this.runningTick || this.appRef._runningTick) {
      return false;
    }
    // If we're inside the zone don't bother with scheduler. Zone will stabilize
    // eventually and run change detection.

    return true;
  }

  /**
   * Calls ApplicationRef._tick inside the `NgZone`.
   *
   * Calling `tick` directly runs change detection and cancels any change detection that had been
   * scheduled previously.
   *
   * @param shouldRefreshViews Passed directly to `ApplicationRef._tick` and skips straight to
   *     render hooks when `false`.
   */
  private tick(): void {
    // When ngZone.run below exits, onMicrotaskEmpty may emit if the zone is
    // stable. We want to prevent double ticking so we track whether the tick is
    // already running and skip it if so.
    if (this.runningTick || this.appRef.destroyed) {
      return;
    }

    // If we reach the tick and there is no work to be done in ApplicationRef.tick,
    // skip it altogether and clean up. There may be no work if, for example, the only
    // event that notified the scheduler was the removal of a pending task.
    if (this.appRef.dirtyFlags === ApplicationRefDirtyFlags.None) {
      this.cleanup();
      return;
    }

    // The scheduler used to pass "whether to check views" as a boolean flag instead of setting
    // fine-grained dirtiness flags, and global checking was always used on the first pass. This
    // created an interesting edge case: if a notification made a view dirty and then ticked via the
    // scheduler (and not the zone) a global check was still performed.
    //
    // Ideally, this would not be the case, and only zone-based ticks would do global passes.
    // However this is a breaking change and requires fixes in g3. Until this cleanup can be done,
    // we add the `ViewTreeGlobal` flag to request a global check if any views are dirty in a
    // scheduled tick (unless zoneless is enabled, in which case global checks aren't really a
    // thing).
    //
    // TODO(alxhub): clean up and remove this workaround as a breaking change.

    const task = this.taskService.add();
    try {
      this.ngZone.run(
        () => {
          this.runningTick = true;
          this.appRef._tick();
        },
        undefined,
        this.schedulerTickApplyArgs,
      );
    } catch (e: unknown) {
      this.applicationErrorHandler(e);
    } finally {
      this.taskService.remove(task);
      this.cleanup();
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.cleanup();
  }

  private cleanup() {
    this.runningTick = false;
    this.cancelScheduledCallback?.();
    this.cancelScheduledCallback = null;
    // If this is the last task, the service will synchronously emit a stable
    // notification. If there is a subscriber that then acts in a way that
    // tries to notify the scheduler again, we need to be able to respond to
    // schedule a new change detection. Therefore, we should clear the task ID
    // before removing it from the pending tasks (or the tasks service should
    // not synchronously emit stable, similar to how Zone stableness only
    // happens if it's still stable after a microtask).
    if (this.pendingRenderTaskId !== null) {
      const taskId = this.pendingRenderTaskId;
      this.pendingRenderTaskId = null;
      this.taskService.remove(taskId);
    }
  }
}
