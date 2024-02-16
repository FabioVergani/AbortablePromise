import { jest } from '@jest/globals';
import { AbortError } from './CustomError.mjs';
import AbortablePromise from './AbortablePromise.mjs';

describe('AbortablePromise', () => {
	it('acts as promise', async () => {
		const delay = 10;
		const resolvedValue = `${delay} ms must be passed`;
		const promise = new AbortablePromise(resolve => {
			setTimeout(() => resolve(resolvedValue), delay);
		});
		expect(promise).toBeInstanceOf(Promise);
		expect(promise).toBeInstanceOf(AbortablePromise);
		const result = await promise;
		expect(result).toBe(resolvedValue);
	});

	it('should reject with an Error', async () => {
		const promise = new AbortablePromise((resolve, reject) => {
			setTimeout(() => reject(new Error('rejected')), 100);
		});
		try {
			await promise;
		} catch (exception) {
			expect(exception).toBeInstanceOf(Error);
			expect(exception.message).toBe('rejected');
		}
	});

	it('should abort with an AbortError', async () => {
		const promise = new AbortablePromise(() => {});
		promise.abort('aborted');
		try {
			await promise;
		} catch (excepition) {
			expect(excepition).toBeInstanceOf(AbortError);
			expect(excepition.message).toBe('aborted');
		}
	});

	it('should abort then value', async () => {
		const promise = new AbortablePromise((resolve, reject) => {
			setTimeout(() => resolve('too late'), 300);
			setTimeout(() => reject('faster'), 200);
		});
		setTimeout(() => promise.abort('aborted by test'), 100);
		promise
			.catch(error => {
				expect(error).toBeInstanceOf(AbortError);
				expect(error.name).toBe('AbortError');
				expect(error.message).toBe('aborted by test');
				return 'bad';
			})
			.then(value => {
				// console.log(value);
				expect(value).toBe('bad');
			})
			.catch(() => {
				// console.log('never pass');
			})
			.finally(() => {
				// console.log('done');
			});
		try {
			await promise;
			console.log('unreachable');
		} catch (exception) {
			expect(promise.signal.aborted).toBe(true);
			expect(exception).toBeInstanceOf(AbortError);
			expect(exception.name).toBe('AbortError');
			expect(exception.message).toBe('aborted by test');
			// expect(exception.details.isTrusted).toBe(true);
		}
	});

	it('should handle abort event', async () => {
		const promise = new AbortablePromise(resolve => {
			setTimeout(() => resolve('abc'), 200);
		});
		const mockFn1 = jest.fn();
		promise.onabort(mockFn1);
		const mockFn2 = jest.fn();
		promise.onabort(mockFn2);
		try {
			setTimeout(() => promise.abort(), 10);
			await promise;
		} catch (exception) {
			expect(exception.message).toBe('aborted');
		} finally {
			expect(mockFn1).toHaveBeenCalledTimes(1);
			expect(mockFn2).toHaveBeenCalledTimes(1);
		}
	});

	it('can be created from existing promise', async () => {
		const delay = 250;
		const promise = new Promise(resolve => {
			setTimeout(() => resolve('something'), delay * 2);
		});
		const myPromise = AbortablePromise.from(promise);
		const anotherPromise = AbortablePromise.from(myPromise);
		expect(anotherPromise).toBe(myPromise);
		setTimeout(() => myPromise.abort('aborted by test'), delay);
		try {
			await myPromise;
		} catch (exception) {
			expect(exception).toBeInstanceOf(AbortError);
			expect(exception.name).toBe('AbortError');
			expect(exception.message).toBe('aborted by test');
		}
	});

	it('promise.then', async () => {
		const value1 = 1;
		const promise1 = new AbortablePromise(resolve => {
			setTimeout(() => resolve(value1), 1e3);
		});

		const value2 = 2;
		const promise2 = promise1.then(() => value2);

		const value3 = 3;
		const promise3 = promise2.then(() => value3);

		const promise4 = promise3.then(() => value2).then(() => value3);

		expect(promise2).toBeInstanceOf(AbortablePromise);
		expect(promise3).toBeInstanceOf(AbortablePromise);
		expect(promise4).toBeInstanceOf(AbortablePromise);

		expect(await promise1).toBe(value1);
		expect(await promise2).toBe(value2);
		expect(await promise3).toBe(value3);
		expect(await promise4).toBe(value3);
	});

	it('promise.catch', async () => {
		const promise = new AbortablePromise((resolve, reject) => {
			setTimeout(() => {
				reject('throw an error');
			}, 100);
		})
			.catch(exception => {
				expect(exception).toBe('throw an error');
				throw 1;
			})
			.then(() => {
				return 'xxx';
			})
			.catch(reason => {
				expect(reason).toBe(1);
				throw 2;
			})
			.then(undefined, reason => {
				expect(reason).toBe(2);
				throw 3;
			});
		try {
			await promise;
		} catch (e) {
			expect(e).toBe(3);
		}
	});

	it('promise.finally', async () => {
		let token = 0;
		const promise = new AbortablePromise((resolve, reject) => {
			setTimeout(() => {
				reject('throw an error');
			}, 1);
		})
			.catch(reason => {
				token = 1;
				expect(reason).toBe('throw an error');
				throw reason;
			})
			.then(() => {
				token = 2;
				return 200;
			})
			.catch(reason => {
				token = 3;
				expect(reason).toBe('throw an error');
				throw reason + ' again';
			})
			.then(undefined, reason => {
				token = 4;
				expect(reason).toBe('throw an error again');
				throw reason + ' and again';
			})
			.finally(() => {
				expect(token).toBe(4);
			});
		try {
			await promise;
		} catch (e) {
			expect(e).toBe('throw an error again and again');
		}
	});

	it('Promise.all', async () => {
		const promise1 = new AbortablePromise(resolve => {
			setTimeout(() => resolve(500), 500);
		});

		const promise2 = Promise.resolve(100);
		const promise3 = AbortablePromise.all([promise1, promise2]);

		expect(promise3).toBeInstanceOf(AbortablePromise);

		expect(await promise3).toEqual([500, 100]);

		const promise4 = new AbortablePromise(resolve => {
			setTimeout(() => resolve(500), 500);
		});
		const promise5 = Promise.resolve(100);
		const promise6 = AbortablePromise.all([promise4, promise5]);
		setTimeout(() => promise6.abort('I abort it'), 200);
		try {
			await promise6;
		} catch (exception) {
			expect(exception).toBeInstanceOf(AbortError);
			expect(exception.name).toBe('AbortError');
			expect(exception.message).toBe('I abort it');
		}
	});

	it('Promise.allSettled', async () => {
		const promise = new AbortablePromise(resolve => {
			setTimeout(() => resolve(500), 500);
		});
		const promise2 = Promise.reject('a reason');
		const promise3 = AbortablePromise.allSettled([promise, promise2]);
		expect(promise3).toBeInstanceOf(AbortablePromise);
		expect(await promise3).toEqual([
			{
				status: 'fulfilled',
				value: 500
			},
			{
				status: 'rejected',
				reason: 'a reason'
			}
		]);

		const promise4 = new AbortablePromise(resolve => {
			setTimeout(() => resolve(500), 500);
		});
		const promise5 = Promise.resolve(100);
		const promise6 = AbortablePromise.allSettled([promise4, promise5]);
		setTimeout(() => promise6.abort('I abort it'), 200);
		try {
			await promise6;
		} catch (e) {
			expect(e).toBeInstanceOf(AbortError);
			expect(e.name).toBe('AbortError');
			expect(e.message).toBe('I abort it');
		}
	});

	it('Promise.any', async () => {
		const promise = new AbortablePromise(resolve => {
			setTimeout(() => resolve(500), 500);
		});
		const promise2 = Promise.resolve(100);
		const promise3 = AbortablePromise.any([promise, promise2]);
		expect(promise3).toBeInstanceOf(AbortablePromise);
		expect(await promise3).toBe(100);

		const promise4 = new AbortablePromise(resolve => {
			setTimeout(() => resolve(500), 500);
		});
		const promise5 = new AbortablePromise((_, reject) => {
			setTimeout(() => reject(500), 500);
		});
		const promise6 = AbortablePromise.any([promise4, promise5]);
		setTimeout(() => promise6.abort('I abort it'), 200);
		try {
			await promise6;
		} catch (e) {
			expect(e).toBeInstanceOf(AbortError);
			expect(e.name).toBe('AbortError');
			expect(e.message).toBe('I abort it');
		}
	});

	it('Promise.race', async () => {
		expect.assertions(5);
		const promise = new AbortablePromise(resolve => {
			setTimeout(() => resolve(500), 500);
		});
		const promise2 = Promise.resolve(100);
		const promise3 = AbortablePromise.race([promise, promise2]);
		expect(promise3).toBeInstanceOf(AbortablePromise);
		expect(await promise3).toBe(100);

		const promise4 = new AbortablePromise(resolve => {
			setTimeout(() => resolve(500), 500);
		});
		const promise5 = new AbortablePromise((_, reject) => {
			setTimeout(() => reject(500), 500);
		});
		const promise6 = AbortablePromise.race([promise4, promise5]);
		setTimeout(() => promise6.abort('I abort it'), 200);
		try {
			await promise6;
		} catch (e) {
			expect(e).toBeInstanceOf(AbortError);
			expect(e.name).toBe('AbortError');
			expect(e.message).toBe('I abort it');
		}
	});

	it('Promise.resolve', async () => {
		const promise = new AbortablePromise(resolve => {
			setTimeout(() => resolve(500), 500);
		});
		const promise2 = AbortablePromise.resolve(100);
		const promise3 = AbortablePromise.race([promise, promise2]);
		expect(promise3).toBeInstanceOf(AbortablePromise);
		expect(await promise3).toBe(100);

		const promise30 = AbortablePromise.resolve();
		expect(await promise30).toBe(undefined);

		const promise4 = new AbortablePromise(resolve => {
			setTimeout(() => resolve(500), 500);
		});
		const promise5 = new AbortablePromise((_, reject) => {
			setTimeout(() => reject(500), 500);
		});
		const promise6 = AbortablePromise.race([promise4, promise5]);
		setTimeout(() => promise6.abort('I abort it'), 200);
		try {
			await promise6;
		} catch (e) {
			expect(e).toBeInstanceOf(AbortError);
			expect(e.name).toBe('AbortError');
			expect(e.message).toBe('I abort it');
		}
	});

	it('Promise.reject', async () => {
		const ok = new AbortablePromise(resolve => {
			setTimeout(() => resolve('500ms'), 500);
		});
		const ko = AbortablePromise.reject('is bad');
		try {
			await Promise.race([ok, ko]);
		} catch (exception) {
			expect(exception).toBe('is bad');
		}
	});
});
