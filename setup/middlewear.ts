import express, {Express} from "express"
import cookieParser from "cookie-parser"
import session from "express-session"
import cors from "cors"
import { PrismaSessionStore } from "@quixo3/prisma-session-store"
import prisma from "../db"
const ApplyMiddlewear = (app: Express) => {
    app.set("trust proxy", 1)
    app.use(express.json())
    app.use(cors({origin: process.env.client_origin, credentials: true}))
    app.use(session({
        resave: false,
        saveUninitialized: true,
        name: "authToken",
        proxy: true,
        secret: "session",
        store: new PrismaSessionStore(prisma, {
            checkPeriod: 2 * 60 * 1000, 
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined,
        }),
        cookie:  { httpOnly: true, secure: true, maxAge: 1000 * 60 * 60 * 48, sameSite: 'none', domain: process.env.cookie_domain }



    }))
    app.use(cookieParser())

    app.enable('trust proxy')
    return app
}

export default ApplyMiddlewear