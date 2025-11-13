import User from "../models/user.js";
import bcrypt from "bcrypt";


const registerUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    // salt password
    const salt = await bcrypt.genSalt(10);

    // hash password
    const hashedPassword = await bcrypt.hash(password, salt);

    // create new user
    const newUser = new User({
      email,
      password: hashedPassword,
      name,
    });

    // save user to db
    await newUser.save();

    // TODO: send verification email
    // await sendVerificationEmail(newUser);

    res.status(201).json({
      message: "User registered, please verify your email",
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: "Internal Server Error",
    });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
};

export { registerUser, loginUser };
