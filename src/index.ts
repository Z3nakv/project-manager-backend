import httpServer  from "./server";

httpServer.listen(5000, () => {
    console.log(`server listening from http://localhost:5000`);
});