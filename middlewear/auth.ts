import jwt from "jsonwebtoken"
import { RequestHandler, Request , Response } from "express"
import { AuthUser } from "../main"

const Auth: RequestHandler = (req ,res, next) => {

    // @ts-ignore
    // let authCookie = req.session.name 
    let authCookie = req.cookies["auth-cookie"]

    if (!authCookie && process.env.NODE_ENV == "test") authCookie = req.headers["auth"]
    if (!authCookie) return res.status(403).send({error: "No Authentication Passed"})
    try {
        const payload = jwt.verify(authCookie, process.env.key!)
        req._user = payload as AuthUser;
        return next()
    }
    catch(err){
        return res.status(401).send({error: "There was an error verifying your credentials"})
    }
}
export default Auth