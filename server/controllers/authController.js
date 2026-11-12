import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters" });
    }
    if (!email || !emailPattern.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters and include a letter and a number" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email, passwordHash });

    res.status(201).json({ token: generateToken(user._id), user });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;

    // Same message for wrong email and wrong password, so attackers learn nothing
    if (!passwordOk) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({ token: generateToken(user._id), user });
  } catch (err) {
    next(err);
  }
}

export function me(req, res) {
  res.json({ user: req.user });
}