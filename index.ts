import express from "express"
import ErrorHandler from "./error_handling/expressErrHandler"
import ConfigInit from "./setup/config"
import ApplyMiddlewear from "./setup/middlewear"
import ApplyRoutes from "./setup/routes"
import SyncCalendar from "./sync/CalendarSync"

ConfigInit()
console.log("Completed Config...")

let app = express()
app.set("trust proxy", 1)
app = ApplyMiddlewear(app)
app = ApplyRoutes(app)
app.use(ErrorHandler)


const PORT = process.env.PORT || 3000 

module.exports = app.listen(PORT, () => console.log("Listening on port #" + PORT))
if (!(process.env.NODE_ENV == "test")) SyncCalendar()