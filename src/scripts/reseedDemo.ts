import Project from "../models/ProjectModel";
import Task from "../models/TaskModel";

async function reseedDemoData() {
  const demoUserId = process.env.DEMO_USER_ID;

  await Task.deleteMany({ createdBy: demoUserId });
  await Project.deleteMany({ manager: demoUserId });

  /* const demoProject = await Project.create({
    projectName: "Ecommerce NIKE - Demo",
    manager: demoUserId,
    // ...
  }); */

  /* await Task.insertMany([
    { name: "Implementar pasarela de pagos", project: demoProject._id, status: "pending" },
    // ...más tareas de ejemplo
  ]); */
}

export default reseedDemoData;