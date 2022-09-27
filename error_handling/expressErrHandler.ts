import express from "express"
import BaseError from "./baseError"

export default function(err: BaseError, req: express.Request, res: express.Response, next: express.NextFunction) {
    console.log(err.details)
    return res.status(500).send({details: err.details?.endUserMessage || err.message})
}