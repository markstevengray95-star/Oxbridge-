import {expect,test} from "@playwright/test"

// These tests deliberately simulate Gemini's wire protocol and use synthetic Chromium
// microphone input. They do not call Gemini, consume tokens or record real student audio.
test.use({launchOptions:{args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]}})
const question="What happens to acceleration if force increases?"
const answer="Acceleration increases because mass is constant."
const followup="Which assumption would you check?"
async function signIn(page){
 await page.goto("/practice-login?next=/student-home")
 await page.getByLabel("Username").fill(process.env.E2E_TEST_USERNAME)
 await page.getByLabel("Password").fill(process.env.E2E_TEST_PASSWORD)
 await page.getByRole("button",{name:"Start practising"}).click()
 await page.waitForURL(/\/student-home$/)
}
for(const pathname of ["/gemini-live-next","/ai-interview"]){
 test(pathname+" preserves an academic answer through a disconnect and resume",async({page,context})=>{
  await context.grantPermissions(["microphone"])
  await signIn(page)
  const requests=[], openings=[], sockets=[]
  await page.route("**/api/realtime-session",async route=>{
   if(route.request().method()==="GET")return route.fulfill({json:{configured:true,model:"test-live-model"}})
   requests.push(route.request().postDataJSON())
   await route.fulfill({json:{token:"synthetic-test-token",model:"test-live-model",voice:"Gacrux",instructions:"Synthetic test. Do not call a provider."}})
  })
  await page.route("**/api/interview-feedback",route=>route.fulfill({json:{provider:"local",analysis:null}}))
  await page.routeWebSocket(/generativelanguage\.googleapis\.com\/ws\//,socket=>{
   sockets.push(socket)
   socket.onMessage(raw=>{
    const data=JSON.parse(String(raw))
    if(data.setup)socket.send(JSON.stringify({setupComplete:{}}))
    if(data.clientContent){
     openings.push(data.clientContent.turns[0].parts[0].text)
     socket.send(JSON.stringify({serverContent:{outputTranscription:{text:sockets.length===1?question:followup},turnComplete:true}}))
    }
   })
  })
  await page.goto(pathname)
  await page.getByRole("button",{name:"Start live interview",exact:true}).click()
  await expect(page.getByText(question,{exact:true})).toBeVisible({timeout:20000})
  expect(sockets.length).toBe(1)
  sockets[0].send(JSON.stringify({serverContent:{inputTranscription:{text:answer}}}))
  sockets[0].send(JSON.stringify({serverContent:{outputTranscription:{text:followup},turnComplete:true}}))
  await expect(page.getByText(answer,{exact:true})).toBeVisible()
  sockets[0].close({code:1011,reason:"Synthetic interrupted connection"})
  const resume=page.getByRole("button",{name:/^Resume (?:voice )?interview$/})
  await expect(resume).toBeVisible()
  await resume.click()
  await expect.poll(()=>requests.length).toBe(2)
  await expect.poll(()=>openings.length).toBe(2)
  expect(requests[1].resume).toBe(true)
  expect(openings[1]).toContain(answer)
  await expect(page.getByText(answer,{exact:true}).first()).toBeVisible()
  sockets[1].close({code:1011,reason:"Synthetic second interruption"})
  const save=page.getByRole("button",{name:/Save (?:& finish|and review)/})
  await expect(save).toBeVisible()
  await save.click()
  await expect(page.getByText("Voice session diagnostics",{exact:true})).toBeVisible()
  await expect(page.getByRole("heading",{name:"Academic performance review"})).toBeVisible()
  const logs=await page.evaluate(()=>JSON.parse(localStorage.getItem("oxbridge-tutor-progress-v2")||"{}").logs||[])
  const saved=logs.find(log=>log.interviewSource==="live-voice"&&log.events?.some(event=>event.includes("Acceleration increases because mass is constant.")))
  expect(saved).toBeTruthy()
  expect(saved.reliabilityReport.connections).toBe(2)
  expect(saved.reliabilityReport.disconnects).toBe(2)
 })
}
