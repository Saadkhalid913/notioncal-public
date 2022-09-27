import { RequestHandler, Request , Response } from "express"


const asyncHandlerWrapper =  (handler: RequestHandler): RequestHandler  => {
    return async (req,res,next) => {
        try {
            await handler(req,res,next)
        }
        catch(err) {
            return next(err)
        }
    }
}

export default asyncHandlerWrapper