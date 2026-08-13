import Project from "../models/ProjectModel";
import Task from "../models/TaskModel";
import User from "../models/UserModel";


export async function cleanupStaleDemoSessions() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const staleUsers = await User.find({
    isEphemeralDemo: true,
    createdAt: { $lt: twoHoursAgo },
  });

  for (const user of staleUsers) {
    const projects = await Project.find({ manager: user._id });
    const projectIds = projects.map((p) => p._id);

    await Task.deleteMany({ project: { $in: projectIds } });
    await Project.deleteMany({ manager: user._id });
    await User.deleteOne({ _id: user._id });
  }

  if (staleUsers.length > 0) {
    console.log(`[Demo Cleanup] Limpiadas ${staleUsers.length} sesiones abandonadas`);
  }
}