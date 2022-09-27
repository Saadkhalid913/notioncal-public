import express from "express"
import auth from "../middlewear/auth"
import asyncHandlerWrapper from "../middlewear/asyncErrorHandler"
import _ from "lodash"
import prisma from "../db"

const router = express.Router()


const ProfileHandler = asyncHandlerWrapper(async (req,res) => {
    const { id } = req._user
    const User = await prisma.user.findFirst({ where: {id}, 
        include: {
            calendars: true,
            integrations: true,
            pages: true,
        }
    })
    
    if (!User) return res.status(403).send({error: "Could not find your profile info"})
    
    const SelectedFields = _.pick(User, ["email", "calendars", "id", "NotionConnected", "integrations", "pages", "pfpUrl", "name"])
    return res.send(SelectedFields)
})

router.get("/me", auth, ProfileHandler)

export default router