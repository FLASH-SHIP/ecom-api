async function run() {
  const url = 'http://localhost:4001/api/trpc/viewer.translations.translationStatus?batch=1&input=%7B%220%22%3A%7B%22entityType%22%3A%22tag%22%2C%22entityId%22%3A9%7D%7D';
  try {
    const res = await fetch(url);
    console.log("STATUS CODE:", res.status);
    const body = await res.text();
    console.log("RESPONSE BODY:", body);
  } catch (error) {
    console.error("FETCH ERROR:", error);
  }
}

run();
