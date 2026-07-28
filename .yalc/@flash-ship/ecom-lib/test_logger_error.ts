import { maskSensitiveData } from "./src/logger";

const err = new Error("Test Error message");
const data = {
  msg: "Something went wrong",
  error: err,
  createdAt: new Date("2026-06-26T03:00:00.000Z"),
};

console.log("Masked Output:", JSON.stringify(maskSensitiveData(data), null, 2));
