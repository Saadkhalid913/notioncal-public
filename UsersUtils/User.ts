import _ from "lodash";
import type { CalendarEventSchema, CalendarItemsResponse, NotionAccessToken, NotionPageInfo } from "../main";
import jwt from "jsonwebtoken"
import { AddEventToNotion, CreateDatabase, GetUserNotionPages } from "../utils/NotionUtils";
import { SearchResponse } from "@notionhq/client/build/src/api-endpoints";
import { Prisma, User, Integration, NotionPage } from "@prisma/client";
import prisma from "../db";
import BaseError from "../error_handling/baseError";

const calendarProperties = ["kind", "summary", "etag", "id", "timeZone", "colorId", "backgroundColor", "foregroundColor", "accessRole", "hidden", "selected", "primary", "deleted"]

export function GenerateAuthToken(user: User) {
    const key = process.env.key!
    const token = jwt.sign({id: user.id, email: user.email}, key)
    return token
}
export async function AddUserCalendars(id: string, calendars: CalendarItemsResponse) {
    if (!calendars) throw new Error("Calendars must be defined")

    calendars = calendars?.filter(c => !!c.id)
    calendars = calendars.map(c => {return {ownerId: id, ..._.pick(c, calendarProperties)}})

    type CalendarData = (Omit<typeof calendars[number], "id"> & {id: string, ownerId: string})[] 
    let CalendarResponseData = calendars as unknown as CalendarData
    const response = await prisma.calendar.createMany({ data : CalendarResponseData })
}
export async function UpdateUserSyncToken(IntegrationID: string, nextSyncToken: string) {
    try{
        const response = await prisma.integration.update({
            where: {
                id: IntegrationID
            },
            data: {
               nextSyncToken: nextSyncToken
            }
        })
    }
    catch(err) {
        throw new BaseError("Error updating sync token", {
            userID: "",
            resource: {
                integrationId: IntegrationID,
                error: err,
                nextSyncToken,
            }
        })
    }
}
export async function AddUserNotionAccessToken(id: string, AccessToken: NotionAccessToken) {
    const response = await prisma.user.update({
        where: { id },
        data: { notion_access_token: AccessToken, NotionConnected: true }
    })
    return response
}
export async function GetUserLatestUserPagesAndUpdate(UserID: string, notion_access_token: NotionAccessToken) {
    const access_token = notion_access_token.access_token
    let TotalPages: (NotionPageInfo & {userID: string})[] = []
    let NextCursor: string | null = null

    
    do {
        const PageResponse: SearchResponse = await GetUserNotionPages(access_token, NextCursor || undefined)        
        NextCursor = PageResponse.next_cursor
        let Pages = PageResponse.results.map((p: any) => {
            return {
                id: p.id,
                title: p.properties.title?.title?.[0]?.text?.content ?? "", 
                url: p.url, 
                last_edited_time: p.last_edited_time,
                created_time: p.created_time,
                userID: UserID
            }
        }).filter(p => p.title !== "")
        TotalPages = TotalPages.concat(Pages)
    }
    while (NextCursor)
    console.log("Updating pages")
    await prisma.$transaction([
        prisma.notionPage.deleteMany({where: { userID: UserID }}),
        prisma.notionPage.createMany({data: TotalPages})
    ])
    console.log("updated pages")
    return TotalPages
}
export async function CreateNewIntegration(UserID: string, calendarID: string, NotionDatabaseID: string, Name: string, url: string) {
    const User = await prisma.user.findFirst( {where : { id: UserID }})
    if (!User) throw new Error("Could not find user to create new integration")   

    const AllCalendars = await prisma.calendar.findMany({ 
        where: {
            ownerId: {
                equals: UserID
            }
        }
    })

    const calendar = AllCalendars.find(c => c.id === calendarID)
    const CalendarName = calendar?.summary
    if (!CalendarName) throw new Error("Could not find a calendar with the specified ID")
    const NewIntegration = await prisma.integration.create({
        data: {
            name: Name, 
            calendar_id: calendarID,
            calendar_name: CalendarName,
            notionDatabaseID: NotionDatabaseID,
            owner_id: User.id,
            url
        }
    })

    return NewIntegration
}
export async function GetUserIntegrationsWithoutSyncTokens(UserID: string): Promise<Omit<Integration, "nextSyncToken">[]> {
    const IntegrationFields = {
        id: true,               
        name   : true,
        notionDatabaseID : true,
        disabled         : true,    
        calendar_name    : true,
        owner_id         : true,
        calendar_id      : true,
        url              : true
    }

    const integrations = await prisma.integration.findMany({
        where: {
            owner_id: UserID
        },
        select: IntegrationFields
    })
    return integrations      
}
export async function CreateDatabaseForUser(PageID: string, UserID: string, DBName: string) {
    const response = await prisma.user.findFirst({ where: {id: UserID}})
    if (!response) return

    const access_token = (response.notion_access_token as Prisma.JsonObject)?.access_token
    if(!access_token) return

    const databaseResponse = await CreateDatabase(PageID, access_token as string, DBName)
    return databaseResponse 
}
export async function HandleEventUpdate(e: CalendarEventSchema[], id: string, calendarId: string,  auth: string, NotionDatabaseID: string, integrationID: string) {
    e = e.sort((a, b) => (Date.parse(a.created!)) - (Date.parse(b.created!))) // sorts events by recency 
    
    // this extracts the GCal event IDs of incoming confirmed events 
    const ConfirmedEventIDs = e.map(e => {
        return (e.status === "cancelled") ? undefined : e.id
    })


    let UpdatedEventRecords = await prisma.event.findMany({
        where: {
            parent_integration_id: integrationID
        },
        select: {
            id: true
        }
    })


    // // we extract indices to be used for segmenting data 
    const UpdatedEventIDs = UpdatedEventRecords.map(i => i.id)

    // // TODO - REFACTOR THIS LOGIC TO ONLY USE ONE FOR-LOOP AND CHECK FOR THREE CONDITIONS
    let CancelledEvents = e.filter(event => event.status === "cancelled") // all cancelled events
    let ConfirmedEvents = e.filter(event => (event.status !== "cancelled" && !(UpdatedEventIDs.includes(event.id!)))) // we ensure that new confirmed events do not overlap with updated events
    let UpdatedEvents = e.filter(event => (event.status !== "cancelled" && UpdatedEventIDs.includes(event.id!)))  // we assert that incoming events are in the updated events array  


    const DeleteIntegration = async () => {
        const response = await prisma.integration.delete({where: {id: integrationID}})
        console.log(`DELETED INTEGRAION WITH ID: ${response.id}`)
    }

    if (NotionDatabaseID && auth) {
        const IncomingEvents = e.filter(event => event.status !== "cancelled")
        addEventsToNotionWithRateLimit(IncomingEvents, auth, NotionDatabaseID, DeleteIntegration)
    } 

    // perform necessary operations on incoming events 
    await SaveEvents(ConfirmedEvents, id, integrationID)
    await CancelEvents(CancelledEvents, id, calendarId)
    await UpdateEvents(UpdatedEvents, integrationID)
}
function addEventsToNotionWithRateLimit(events: CalendarEventSchema[], notion_access_token: string , NotionDatabaseID: string, onDelete: () => void, intervalSize=5000) {
    let i = 0
    if (events.length < 1) return
    const interval = setInterval(() => {
        const event = events[i]
        AddEventToNotion(event, notion_access_token, NotionDatabaseID).catch(err => {
            console.log(err)
            onDelete()
            clearInterval(interval)
        })

        i +=1 
        if (i == events.length) clearInterval(interval)
    }, intervalSize)
}
async function SaveEvents(e: CalendarEventSchema[], id: string, integrationID: string) {
    const EventPayload = e.map(e => {
        const { id, summary } = e 
        return {
            id: id as string, 
            summary,
            start: e.start?.dateTime,
            end: e.end?.dateTime,
            parent_integration_id: integrationID,
            created: Date.parse(e.created as string)
        }
    })
    const response = prisma.event.createMany({data: EventPayload})  
    return response
}
async function CancelEvents(e: CalendarEventSchema[], id: string, calendarId: string) {
    if (e.length == 0) return ;
    const CancelledEventIds = e.map(event => event.id!)
    const DeletedEventsResponse = await prisma.event.deleteMany({
        where: {
            id: {
                in: CancelledEventIds
            }
        }
    })

    console.log(DeletedEventsResponse)
}
async function UpdateEvents(UpdatedEvents: CalendarEventSchema[], integrationID: string) {
    const writeCalls = []
    const EventPayload = UpdatedEvents.map(e => {
        const { id, summary } = e 
        return {
            id: id as string, 
            summary,
            start: e.start?.dateTime,
            end: e.end?.dateTime,
            parent_integration_id: integrationID
        }
    })
    for (let event of EventPayload) {
        // if (typeof event.id !== "string") return
        writeCalls.push(prisma.event.update({
            where: {
                id_parent_integration_id: {
                    id: event.id!,
                    parent_integration_id: integrationID
                }
            },
            data: event
        }))
    }
    prisma.$transaction(writeCalls)
}
