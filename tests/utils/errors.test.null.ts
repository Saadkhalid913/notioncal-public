// import * as utils from "../../utils/utils"
// import request from "supertest"
// import type { Server } from "http"
// import prisma from "../../db"
// import { User } from "@prisma/client"
// import { GenerateAuthToken } from "../../UsersUtils/User"
// let server: Server

// beforeEach(() => { server = require("../../index")})
// afterEach(() => { server && server.close() })

// export async function GetJWT(): Promise<string> {
//     const test_user = await prisma.user.findFirst({where: {email: test_email}})
//     expect(test_user).toBeTruthy()
//     const testJWT = GenerateAuthToken(test_user as User)
//     return testJWT
// }
// describe("/api/integrations", () => {

//     it("Should return an error", async () => {
//         const JWT = await GetJWT() 
//         const response = request(server).get("/api/integrations/create").send({Headers: {auth: GetJWT}})
//     })

// })

// const test_email: string = process.env.test_email!
