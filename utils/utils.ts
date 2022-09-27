import mongoose from "mongoose"
import { google } from "googleapis"
import { OAuth2Client } from "google-auth-library"
import { BodyResponseCallback } from "googleapis/build/src/apis/abusiveexperiencereport"
import { calendar_v3 } from "googleapis"
import { CalendarItemsResponse, token } from "../main"
import prisma from "../db"
import BaseError from "../error_handling/baseError"


export function getCreds() {
  return JSON.parse(process.env.CREDS!)
}

export function GetOAuth2(credentials: any) {
    // this function returns an oauth2 object with some given credentials 
    const {client_secret, client_id, redirect_uris} = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);
    return oAuth2Client
  }
  
export function getAccessTokenURL(oAuth2Client: any, SCOPES: string[]) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    return authUrl
  }
  

async function GetOauthClient(email: string): Promise<OAuth2Client>{
  const user = await prisma.user.findFirst({where: {email}})
  if (!user) throw new Error("Could not find a user with that email")
  const token = user.token
  const oAuth2Client = GetOAuth2(getCreds())
  oAuth2Client.setCredentials(token as token)
  return oAuth2Client
}

export async function GetUserCalendars(email: string, cb: (items: CalendarItemsResponse) => any): Promise<any> {
  
  const oAuth2Client = await GetOauthClient(email);
  const calendar = google.calendar({version: "v3", auth: oAuth2Client})

  let data = undefined
  
  const CalendarListResponseCallback: BodyResponseCallback<calendar_v3.Schema$CalendarList> = (err, res) => {
    if (err) {
      throw new BaseError("Error on getting user calendars", {
        functionName: "GetUserCalendars",
        userID: email,
        resource: err
      })
    }
    if (res) cb(res.data.items)
  }

  calendar.calendarList.list({}, CalendarListResponseCallback)
}

export function roughSizeOfObject( object: any ) {

  let objectList = [];
  let stack = [ object ];
  let bytes = 0;

  while ( stack.length ) {
      let value = stack.pop();

      if ( typeof value === 'boolean' ) {
          bytes += 4;
      }
      else if ( typeof value === 'string' ) {
          bytes += value.length * 2;
      }
      else if ( typeof value === 'number' ) {
          bytes += 8;
      }
      else if
      (
          typeof value === 'object'
          && objectList.indexOf( value ) === -1
      )
      {
          objectList.push( value );

          for( let i in value ) {
              stack.push( value[ i ] );
          }
      }
  }
  return bytes;
}
export function GetClient(token: token) {
  try {
    const oAuth2Client = GetOAuth2(getCreds())
    oAuth2Client.setCredentials(token)
    return oAuth2Client
  }
  catch(err) {
    throw new BaseError("Could not access your google account", {
      endUserMessage: "Could not access your google account, please contact support"
    })
  }
}

