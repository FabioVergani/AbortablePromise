import { AbortError } from './CustomError.mjs';

const { Promise, AbortController } = globalThis;

export default class AbortablePromise extends Promise {
	static from(promise) {
		return promise?.then && promise instanceof AbortablePromise
			? promise
			: new AbortablePromise((resolve, reject) => promise.then(resolve).catch(reject));
	}
	#controller;
	get signal() {
		return this.#controller.signal;
	}
	constructor(executor, controller = new AbortController()) {
		super((resolve, reject) => {
			const signal = controller.signal;
			signal.addEventListener('abort', event => {
				reject(new AbortError(signal.reason, event));
			});
			executor(resolve, reject);
		});
		this.#controller = controller;
	}
	onabort(abortHandler) {
		this.#controller.signal.addEventListener('abort', abortHandler);
	}
	abort(reason) {
		this.#controller.abort(reason ?? 'aborted');
	}
}
