import { isSignal, Signal } from '@angular/core';

export type SignalOrValue<T> = Signal<T> | T;

export function toValue<T>(v: SignalOrValue<T>) {
  if (isSignal(v)) return v();
  return v;
}
