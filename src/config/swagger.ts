import swaggerJsdoc from "swagger-jsdoc";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Trello Clone API",
            version: "1.0.0",
            description: "API REST para gestión de proyectos, tareas y usuarios",
        },
        servers: [
            {
                url: "http://localhost:5000/api",
            },
        ],
    },
    apis: [
        "./src/routes/*.ts",
    ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;