import {Express} from "express"
import GoogleRouter from "../routes/GoogleLogin"
import UserRouter from "../routes/UserRoutes"
import IntegrationRouter from "../routes/IntegrationRoutes"
import NotionRouter from "../routes/NotionRoutes"

const ApplyRoutes = (app: Express) => {
    app.use("/", GoogleRouter)
    app.use("/api/notion", NotionRouter)
    app.use("/api/profile", UserRouter)
    app.use("/api/integrations", IntegrationRouter)

    return app
}


export default ApplyRoutes
