export default defineUnlistedScript(() => {
  console.info("network interceptor is running...");

  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    try {
      const url = String(args[0]);

      if (url.includes("/api/cars")) {
        const json = await response.clone().json();

        window.postMessage({
          source: "finn-lens",
          type: "FINN_CARS_RESPONSE",
          payload: json,
          url,
        });
      }
    } catch (err) {
      console.error(err);
    }

    return response;
  };
});