import puppeteer, { Browser, Page } from "puppeteer"

const newBrowser: () => Promise<Browser> = async () => {
  return await puppeteer.launch({
    headless: true,
    slowMo: 10,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      // "--single-process",
      "--disable-gpu",
      "--disable-features=site-per-process",
      "--proxy-server='direct://'",
      "--proxy-bypass-list=*",
      "--lang=ja",
    ],
    timeout: 90_000,
    protocolTimeout: 60_000,
  })
}

export const newPage = async () => {
  const page = await (await newBrowser()).newPage()
  page.setExtraHTTPHeaders({
    "Accept-Language": "ja-JP",
  })
  if (process.env.USER_AGENT) await page.setUserAgent(process.env.USER_AGENT)
  await page.setRequestInterception(true)
  page.setDefaultNavigationTimeout(90_000)
  page.on("request", (request) => {
    if (request.resourceType() in ["image", "stylesheet", "font", "media"]) {
      request.abort()
    } else {
      request.continue()
    }
  })
  return page
}

export const goto = async ({
  url,
  userAgent,
  timeout,
}: {
  url: string
  userAgent?: string
  timeout?: number
}): Promise<Page | undefined> => {
  const page = await newPage()
  if (userAgent) await page.setUserAgent(userAgent)
  page.setCacheEnabled(true)
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeout ?? 60_000,
    })
    if ((response?.status() ?? 200) > 399) return
    const contentType = response?.headers()["content-type"]
    if (!contentType?.includes("text/html")) return
  } catch {
    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: timeout ?? 60_000,
    })
    if ((response?.status() ?? 200) > 300) return
    const contentType = response?.headers()["content-type"]
    if (!contentType?.includes("text/html")) return
  }
  return page
}

export const getTextByXPath = async ({
  page,
  xpath,
  pattern,
  attribute,
}: {
  page: Page
  xpath: string
  pattern?: string
  attribute?: string
}): Promise<(string | null)[] | undefined> => {
  const selectorList = await page.$$(`::-p-xpath(${xpath})`)
  if (selectorList.length == 0) return
  const contentList = await Promise.all(
    selectorList.map((selector) =>
      selector.evaluate(
        (el, attribute) =>
          !!attribute ? el.getAttribute(attribute) : el.textContent,
        attribute
      )
    )
  )

  if (contentList.length == 0) return
  if (pattern) {
    return contentList.map((content) => {
      const matched = content?.match(new RegExp(pattern))
      if (!matched || matched.length < 1) return content
      return matched[1]
    })
  }
  return contentList
}
