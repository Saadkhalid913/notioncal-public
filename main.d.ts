
import { GaxiosResponse } from "gaxios";
import { calendar_v3 } from "googleapis";
import mongoose from "mongoose";



export type AuthUser =  { 
    id: string;
    email: string
}

export type CalendarItemsResponse = GaxiosResponse<calendar_v3.Schema$CalendarList>["data"]["items"]
export type CalendarListResponse = GaxiosResponse<calendar_v3.Schema$CalendarList>

export type CalendarEventsListResponse = GaxiosResponse<calendar_v3.Schema$Events>
export type CalendarEvent = calendar_v3.Schema$Event

export type CalendarEventSchema = Pick<CalendarEvent, "summary" 
                                                    | "description" 
                                                    | "start" 
                                                    | "end" 
                                                    | "colorId" 
                                                    | "attachments" 
                                                    | "attendees" 
                                                    | "creator" 
                                                    | "location" 
                                                    | "htmlLink" 
                                                    | "status" 
                                                    | "id"
                                                    | "created">
                                                    
export type CalendarEventQueryResponse = Partial<Pick<CalendarEvent, "summary" 
                                                    | "description" 
                                                    | "start" 
                                                    | "end" 
                                                    | "colorId" 
                                                    | "attachments" 
                                                    | "attendees" 
                                                    | "creator" 
                                                    | "location" 
                                                    | "htmlLink" 
                                                    | "status" 
                                                    | "id"
                                                    >> & { created: number}



export type NotionAccessToken = {
    access_token: string,
    token_type: string,
    bot_id: string,
    workspace_name: string,
    workspace_icon: string,
    workspace_id: string,
    owner: {
        type:string,
        user: {
            object: string,
            id: string,
            name: string,
            avatar: string,
            type: string,
            person: {
                email: string
            }
        }
    }
    
}

export type NotionPageInfo = {
    id: string,
    title: string,
    url: string
    last_edited_time:string,
    created_time:string
  }



declare module 'express-serve-static-core' {
    interface Request {
        _user: AuthUser
    }
    interface Response {
        _user: AuthUser
    }
}


export type token = {
    access_token: string,
    refresh_token: string,
    scope: string,
    token_type: string,
    id_token: string,
    expiry_date: number,
}

export type PrismaPayloadEvent = {
    id: string;
    summary: string | null | undefined;
    start: string | null | undefined;
    end: string | null | undefined;
    parent_integration_id: string;
    created: number;
}