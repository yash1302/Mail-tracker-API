import User from "../models/userModel.js";

export const createUser = async (user) => {
  try {
    const newUser = new User(user);
    await newUser.save();
    return newUser;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const findUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ email });
    return user;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getUsers = async () => {
  try {
    const users = await User.find();
    return users;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
