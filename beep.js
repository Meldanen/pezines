const fs = require('fs')
const cheerio = require('cheerio')
const axios = require('axios')
const FormData = require('form-data')
const geoCordsConvert = require('geo-coordinates-parser')

const extractValues = (html) => {
  const $ = cheerio.load(html)
  const values = []
  $('#petroleumPriceDetailsFootable tbody tr').each(function () {
    let r = {
      brand: '',
      name: '',
      location: {},
      price: '',
    }
    r.brand = $(this).find('td:nth-child(1)').text().trim()
    r.name = $(this).find('td:nth-child(2)').text().trim()
    r.location.address = $(this).find('td:nth-child(3) a').text().split('\n').map(i => i.trim()).join(', ')
    let cords = decodeURI($(this).find('td:nth-child(3) a').attr('href').split('coordinates=')[1].trim().replace('%2C', ', '))
    cords = geoCordsConvert(cords, 8)
    r.location.coordinates = {
      latitude: cords.decimalLatitude,
      longitude: cords.decimalLongitude,
    }
    r.location.area = $(this).find('td:nth-child(4)').text().trim()
    r.price = parseFloat($(this).find('td:nth-child(5)').text().trim().replace(',', '.'))
    values.push(r)
  })
  return values
}

const doApi = (petrolType) => {
  const data = new FormData()
  data.append('Entity.PetroleumType', petrolType)
  data.append('Entity.StationCityEnum', 'All')
  data.append('__RequestVerificationToken', 'lzjSL49B65Z-ZH6L73X7_tZwNfZERQf-X-5awZdpNkzadw7J5myKp-vA5s1ldCYM7GgD3yYVvODTYkPRl_f3_6ydZ7Q1')

  return axios.post('https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices', data, {
    headers: {
      'Cookie': 'ASP.NET_SessionId_Efef=e1uicx2gb4xsosmyckqb1c20; Language=el-GR; __RequestVerificationToken=xCXOwfbI9ER4FmrfhQrgALw9Lg2gxgdARJrOMErYEJpMp4kZFXQo6G2fkwcus27lEmwcouHdeE2bnZScfHbHR-txsJQ1',
      'Content-Type': 'multipart/form-data',
    }
  })
}

const run = async () => {
  const MAP = {
    1: {
      type: '95',
      stations: [],
    },
    2: {
      type: '98',
      stations: [],
    },
    3: {
      type: 'Petreleo kinisis',
      stations: [],
    },
    4: {
      type: 'Petreleo Thermansis',
      stations: [],
    },
    5: {
      type: 'Kirozini',
      stations: [],
    },
  }
  for (let i = 1; i <= 5; i++) {
    try {
      // let response = {
      //   data: fs.readFileSync(`${__dirname}/example.html`)
      // }
      const response = await doApi(i)
      MAP[i].stations = extractValues(response.data)
    } catch (err) {
      console.log(err)
    }
  }
  let date = new Date()
  fs.writeFileSync(__dirname + `/storage/petrol-${date.toISOString().split('T')[0]}.json`, JSON.stringify(Object.values(MAP)))
  date.setDate(date.getDate() - 1);
  if (fs.existsSync(__dirname + `/storage/petrol-${date.toISOString().split('T')[0]}.json`)) {
    fs.unlinkSync(__dirname + `/storage/petrol-${date.toISOString().split('T')[0]}.json`)
  }
}

run().then(() => console.log('finished'))
