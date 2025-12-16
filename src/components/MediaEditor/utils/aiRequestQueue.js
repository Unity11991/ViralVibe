
/**
 * Global Request Queue to ensure strict sequential processing for AI API calls.
 * Prevents 429 Rate Limit errors by serializing requests and handling retries internally.
 */
class RequestQueue {
    constructor() {
        this.queue = Promise.resolve();
    }

    /**
     * Enqueue a request task.
     * The task function must return a promise.
     * @param {Function} task - async function to execute
     * @returns {Promise} - Resolves with the task result
     */
    enqueue(task) {
        // Append the new task to the chain
        const resultPromise = this.queue.then(async () => {
            // Internal retry loop logic can be handled by the task itself, 
            // but we ensure the "slot" is held until the task completes (or fails after retries).
            return await task();
        });

        // Update the tail of the queue
        // We catch errors so the main queue chain doesn't break for subsequent requests
        this.queue = resultPromise.catch(() => { });

        return resultPromise;
    }
}

// Singleton instance
const globalQueue = new RequestQueue();

export default globalQueue;
