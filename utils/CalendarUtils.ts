import { google } from "googleapis"
import { GetClient } from "./utils"
import { CalendarEvent, CalendarEventSchema, CalendarEventsListResponse, NotionAccessToken, token } from "../main"
import { OAuth2Client } from "google-auth-library"
import {  HandleEventUpdate } from "../UsersUtils/User"
import { UpdateUserSyncToken } from "../UsersUtils/User"
import prisma from "../db"
import BaseError from "../error_handling/baseError"

export function GetCalendarEvents(auth: any, cb: any, nextPageToken?: string, calendarId?: string) {
  calendarId = (calendarId) ? calendarId : "primary"
  const calendar = google.calendar({version: "v3", auth })
  calendar.events.list({
    auth,
    calendarId,
    pageToken: nextPageToken,
  }, (err: any, res: any) => cb(err,res))
  return null
}

export function GetLatestSyncToken(auth: any, next: (err?: any, token?: string) => void , pages: number) {
  return (err: any, res: any) => {
    if (err) next(err)
    if (res?.data.nextSyncToken) return next(null, res.data.nextSyncToken)
    if (res?.data.nextPageToken) {
      pages +=1;
      console.log("Pages:  " + pages, " ", res.data.items[0].created)
      GetCalendarEvents(auth, GetLatestSyncToken(auth, next, pages), res.data.nextPageToken)
    }
  }
}

export function  GetLatestSyncTokenAndSaveEvents(auth: OAuth2Client,
  next: (err?: any, token?: string) => void , // this function takes an error object or the token
  save: (Events: CalendarEventSchema[]) => Promise<void>, // the save function for calendar events 
  pages: number, // pointer to the number of pages 
  limit: number, // pointer to the number of pages 
  AllEvents: any[] // the pointer to the culminative event array 
  ) {

    // handler function for current call
    return async (err: any , res: CalendarEventsListResponse | null | undefined) => {
      if (err) next(err)

      if (res?.data.nextSyncToken) {
        const { items } = res.data
        if (!items) return next(null, res.data.nextSyncToken) 
        let Events: CalendarEventSchema[] = items.map(getNeededProperies)
        AllEvents = AllEvents.concat(Events)

        // only save the last n events from the total events array (n = limit)
        await save(AllEvents.slice(-1 * limit)).catch(err => {throw new Error("Error in save function")})

        return next(null, res.data.nextSyncToken)
      }


      // handle remaining pages
      if (res?.data.nextPageToken) {

        pages +=1;
        console.log("Pages:  " + pages, " ", res?.data?.items?.[0].created)
        const CleanedEvents = res?.data?.items?.map(getNeededProperies)
        AllEvents = AllEvents.concat(CleanedEvents)

        // get calendar events (we pass the necessary parameters needed for this call so that the 
        // correct callback is called upon final page load)
        GetCalendarEvents(auth, GetLatestSyncTokenAndSaveEvents(auth, next, save, pages, limit, AllEvents), res.data.nextPageToken)
      }
    }
}

export const getNeededProperies = ({
  summary,
  description,
  start,
  end,
  colorId,
  attachments,
  attendees,
  creator,
  location,
  htmlLink,
  status,
  id,
  created
}: CalendarEvent): CalendarEventSchema => 
{ 
  return {
    summary,
    description,
    start,
    end,
    colorId,
    attachments,
    attendees,
    creator,
    location,
    htmlLink,
    status,
    id,
    created 
  }
}

export async function CheckForUpdatedCalendarEvents(
      UserId: string,  
      IntegrationID: string, 
      calendarId: string, 
      NotionDatabaseID: string, 
      nextSyncToken: string) {
  
  if (!calendarId) return 
  
  const user = await prisma.user.findFirst({where: { id: UserId }})  
  if (!user) return 

  const { token, id } = user
  const auth = GetClient(token as token)
  const notion_access_token = (user.notion_access_token as NotionAccessToken).access_token

  const handler = (err?: any, nextSyncToken?: string) => {
    if (err) return console.log("There was an error updating sync token", err)
    if (nextSyncToken) UpdateUserSyncToken(IntegrationID, nextSyncToken).catch()
  }

  const save = async (e: CalendarEventSchema[]) => {
    if (e.length == 0) return
    const response = await HandleEventUpdate(e, id, calendarId as any, notion_access_token, NotionDatabaseID, IntegrationID)
  }

  const PAGE_NUMBER = 0
  const PREV_EVENT_LIMIT = 100
  const calendar = google.calendar({version: "v3", auth})

    calendar.events.list({
      auth,
      calendarId: calendarId,
      syncToken: nextSyncToken
    }, GetLatestSyncTokenAndSaveEvents(auth, handler, save, PAGE_NUMBER, PREV_EVENT_LIMIT, []))

}

export async function SyncUserEventsOnCalendar(
      id: string, 
      oAuth2Client: OAuth2Client, 
      calendarId: string, 
      IntegrationID: string,  
      NotionDatabaseID: string,
      auth: string) {
  
  console.log("Starting Sync for new integration")

  const HandleSync = async (err?: any, nextSyncToken?: string) => {
    if (err) throw new BaseError("There was an error syncing events on calendar", {
      resource: err
    })
    let response 
    if (!err && nextSyncToken)
    response = await UpdateUserSyncToken(IntegrationID, nextSyncToken);
  }

  const save = async (e: CalendarEventSchema[]) => {
      await HandleEventUpdate(e, id, calendarId, auth, NotionDatabaseID, IntegrationID.toString())
  }

  const PAGE_NUMBER = 0
  const PREV_EVENT_LIMIT = 100

  const callback = GetLatestSyncTokenAndSaveEvents(oAuth2Client, HandleSync, save, PAGE_NUMBER, PREV_EVENT_LIMIT, [])
  GetCalendarEvents(oAuth2Client, callback, undefined, calendarId as string) 
}