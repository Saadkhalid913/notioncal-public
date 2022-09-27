import express from "express"
import { CreateDatabaseForUser, CreateNewIntegration,GetUserIntegrationsWithoutSyncTokens } from "../UsersUtils/User"
import { SyncUserEventsOnCalendar } from "../utils/CalendarUtils"
import auth from "../middlewear/auth"
import asyncHandlerWrapper from "../middlewear/asyncErrorHandler"
import { GetClient } from "../utils/utils"
import prisma from "../db"
import { token } from "../main"
import { Prisma } from "@prisma/client"
import { ValidateIntegration } from "../validators"
import BaseError from "../error_handling/baseError"


const router = express.Router()



const CreateIntegrationHandler = asyncHandlerWrapper(async (req: express.Request<any, any, any>, res: express.Response) => {
    let { calendar_id, NotionDatabaseID: notionDatabaseID, name, pageID } = req.body
    const UserID = req._user.id
    
    const { error: ValidationError } = ValidateIntegration({calendar_id, name, pageID})
    
    if (ValidationError) throw new BaseError(ValidationError.details[0].message, {
        functionName: "CreateIntegrationHandler",
        userID: UserID,
        resource: {calendar_id, name, pageID}
    })
    
    const user = await prisma.user.findFirst({where: {id: UserID}})
    if (!user) throw new BaseError("Could not find your profile", {
        userID: UserID
    })

    const access_token = (user.notion_access_token as Prisma.JsonObject).access_token
    if(!access_token) throw new BaseError("No Notion Access Token Connected", {
        userID: UserID
    })
    

    let dbUrl: string = ""
    if (!notionDatabaseID) {
        const response =  await CreateDatabaseForUser(pageID, UserID, name)
                          .catch(err => { throw new BaseError("Error creating Notion database",{
                              userID: UserID,
                              endUserMessage: "There was an error creating your integration, it may be an issue with your notion account, please contact support!",
                              resource: err
                          })})

        notionDatabaseID = response?.id;
        dbUrl = response?.url
    }

    const response = await CreateNewIntegration(UserID, calendar_id, notionDatabaseID, name, dbUrl)

    const { token, id } = user  
    const IntegrationID = response.id
    const auth = GetClient(token as token)

    await SyncUserEventsOnCalendar(id, auth, calendar_id, IntegrationID, notionDatabaseID, access_token as string)
    return res.send(response)
})

const GetIntegrationsHandler = asyncHandlerWrapper(async (req,res) => {
    const UserID = req._user.id
    const response = await GetUserIntegrationsWithoutSyncTokens(UserID)
    return res.send(response)
})

const DeleteIntegrationHandler = asyncHandlerWrapper(async (req, res) => {
    const { id } = req.params;
    const UserID = req._user.id;

    try {
        const response = await prisma.$transaction([prisma.event.deleteMany({
            where: {
                parent_integration_id: id
            }
            })
            ,prisma.integration.delete({
                where: {
                    id: id
                }
            })])
        res.send({id: response[1].id})
    }
    catch(err) {
        throw new BaseError("Could not delete this integration", {
            functionName: "Delete Integration Handler",
            resource: `integration id: ${id}`,
            userID: UserID,
            endUserMessage: "There was an error deleting this integration, you can disable sync at any time"
        })
    }
})


router.post("/create", auth, CreateIntegrationHandler)
router.get("/", auth, GetIntegrationsHandler)
router.delete("/:id", auth, DeleteIntegrationHandler)

export default router

