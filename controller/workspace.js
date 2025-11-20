import Workspace from "../models/workspace.js";

const createWorkspace = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const user = req.user;

    const workspace = new Workspace({
      name,
      description,
      color,
      owner: user._id,
      members: [
        {
          user: user._id,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
    });

    await workspace.save();

    res.status(201).json(workspace);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getWorkspaces = async (req, res) => {
  try {
    const user = req.user;

    const workspaces = await Workspace.find({
      "members.user": user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json(workspaces);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export { createWorkspace, getWorkspaces };