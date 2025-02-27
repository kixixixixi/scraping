import { goto, getTextByXPath } from "browser"
import "dotenv/config"

const exec = async () => {
  const url = process.env.URL
  const xpath = process.env.XPATH
  if (!url || !xpath) {
    console.error("URL and XPATH are required")
    return
  }
  const page = await goto({
    url,
  })
  if (!page) {
    console.error("Failed to open the page")
    return
  }
  const text = await getTextByXPath({
    page,
    xpath,
  })
  console.log(text)
  await page.close()
}

exec()
