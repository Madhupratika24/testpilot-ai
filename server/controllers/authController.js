import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isStrongPassword(password) {
  return typeof password === "string" && password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters" });
    }
    if (!email || !emailPattern.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (!isStrongPassword(password)) {
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

export async function updateProfile(req, res, next) {
  try {
    const name = String(req.body.name || "").trim();
    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({ message: "Name must be between 2 and 60 characters" });
    }
    req.user.name = name;
    await req.user.save();
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Enter your current and new password" });
    }
    if (!isStrongPassword(newPassword)) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters and include a letter and a number" });
    }

    const correct = await bcrypt.compare(currentPassword, req.user.passwordHash);
    if (!correct) {
      return res.status(400).json({ message: "Your current password is not correct" });
    }

    req.user.passwordHash = await bcrypt.hash(newPassword, 12);
    await req.user.save();
    res.json({ message: "Password changed" });
  } catch (err) {
    next(err);
  }
}