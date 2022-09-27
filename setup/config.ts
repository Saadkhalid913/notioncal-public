import dotenv from "dotenv"
import { PrismaClient } from '@prisma/client'


const ConfigInit = () => {
    const dev_env = (process.env.TS_NODE_DEV) ? "development" : "production"
    dotenv.config({path: `.env.${dev_env}`})
    CheckAllVars()
}


function CheckAllVars() {
    const EnvrionmentVariables = [
        // "CREDS",
        "key",
        "client_origin",
        // "cookie_domain",
        "base_url",
        "notion_api_key",
        "notion_oauth_id",
        "notion_redirect_url"
    ]

    for (let variable of EnvrionmentVariables) {
        if (!process.env[variable]) {
            throw new Error(`MISSING ENVIRONMENT VARIABLE ${variable} -- TERMINATING PROCESS`)
        }
    }
}

export default ConfigInit