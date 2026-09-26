import "dotenv/config";
import readline from "node:readline";
import mongoose from "mongoose";
import User from "../models/User.js";

function ask(question) {
  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    prompt.question(question, (answer) => {
      prompt.close();
      resolve(answer.trim());
    }),
  );
}

function askHidden(question) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this bootstrap command from an interactive terminal.");
  }

  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    let password = "";
    const finish = (error) => {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };
    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === "c") {
        finish(new Error("Admin bootstrap cancelled."));
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        finish();
        return;
      }

      if (key.name === "backspace") {
        password = [...password].slice(0, -1).join("");
        return;
      }

      if (character && !key.ctrl && !key.meta) {
        password += character;
        process.stdout.write("*");
      }
    };

    process.stdin.on("keypress", onKeypress);
  });
}

try {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be configured before bootstrapping an admin.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  if (await User.exists({ role: "admin" })) {
    throw new Error("An admin account already exists; bootstrap can only run once.");
  }

  const email = (await ask("Admin email: ")).toLowerCase();
  const password = await askHidden("Admin password (8+ characters): ");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Password must be at least 8 characters and no more than 72 bytes.");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    existingUser.role = "admin";
    existingUser.password = password;
    await existingUser.save();
  } else {
    await User.create({ name: "Administrator", email, password, role: "admin" });
  }

  console.log(`Admin account bootstrapped for ${email}.`);
} catch (error) {
  console.error("Admin bootstrap failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
