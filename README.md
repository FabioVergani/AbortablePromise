# AbortablePromise

`AbortablePromise` enhances the standard `Promise` with additional functionality to allow aborting the execution of the promise.

In real-life scenarios, AbortablePromise can be particularly useful when dealing with operations that may take a long time to complete, such as network requests, file I/O, or any other asynchronous operation that can be cancelled. 

## Example
```javascript
async function fetchData(url) {
  const controller = new AbortController();
  const promise = fetch(url, controller);
  // controller.abort();
  try {
    const response = await promise;
    const data = await response.json();
    return data;
  } catch (error) {
    if ('AbortError' === error.name) {
      console.log('Fetch request was aborted');
    } else {
      throw error;
    }
  }
}

```

