import React, {useState, useRef} from 'react'
import ID3Writer from 'browser-id3-writer'
import * as mm from 'music-metadata-browser'
import axios from 'axios'
import FileSaver from 'file-saver'

import './App.less'

let title = ''
let album = ''
let fileArrayBuffer
let file
let songDetail

function App() {
  const [songDetails, setSongDetails] = useState([])
  const [songId, setSongId] = useState('')
  const fileElem = useRef(null)

  async function handleFileChange () {
    console.log(fileElem, 'fileElem')
    const files = fileElem.current.files
    if (files.length === 0) {
      return
    }
    file = files[0]
    console.log(file)
    fileArrayBuffer = await readFile(file)
    // 获取歌曲文件meta
    const metadata = await mm.parseBlob(file)
    const info = metadata.common
    title = info.title
    album = info.album
    await handleSearch()
  }

  async function handleSearch (id) {
    let filteredResultIds = []
    if (!id) {
      // 搜索歌曲
      const searchResult = await axios.get(`/search?keywords=${title}&type=1&limit=100`).then(res => res.data.result.songs)
      // 筛选歌曲列表中专辑一致的歌曲
      const filteredResult = searchResult.filter(item => item.album.name.toLowerCase() === album.toLowerCase())
      filteredResultIds = filteredResult.map(item => item.id)
    } else {
      filteredResultIds = [id]
    }
    if (!filteredResultIds.length) {
      alert('未找到歌曲')
      return
    }
    // 获取歌曲详情（封面）默认取第一个
    const songDetailsResult = await axios.get(`/song/detail?ids=${filteredResultIds.join()}`).then(res => res.data.songs)
    setSongDetails(songDetailsResult)
    songDetail = songDetailsResult[0]
    console.log(songDetail)
  }

  async function handleDownload () {
    let response = await fetch(songDetail.al.picUrl)
    let data = await response.blob()
    let metadata = {
      type: 'image/jpeg'
    }
    let imgFile = new File([data], `${songDetail.al.name}.jpg`, metadata)
    const imgArrayBuffer = await readFile(imgFile)
    // 添加MP3信息
    const writer = new ID3Writer(fileArrayBuffer)
    writer
      // 封面
      .setFrame('APIC', {
        type: 3,
        data: imgArrayBuffer,
        description: songDetail.al.name
      })
      // 专辑
      .setFrame('TALB', songDetail.al.name)
      // 年份
      .setFrame('TYER', new Date(songDetail.publishTime).getFullYear())
      // title
      .setFrame('TIT2', songDetail.name)
      // artist
      .setFrame('TPE1', songDetail.ar.map(item => item.name))
    writer.addTag()
    // 下载mp3文件
    const taggedSongBuffer = writer.arrayBuffer
    const blob = writer.getBlob()
    const url = writer.getURL()
    FileSaver.saveAs(blob, file.name)
  }

  function readFile (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = function () {
        const arrayBuffer = reader.result
        resolve(arrayBuffer)
      }
      reader.onerror = function () {
        // handle error
        console.error('Reader error', reader.error)
        reject(reader.error)
      }
      reader.readAsArrayBuffer(file)
    })
  }

  function handleChangeId (e) {
    setSongId(e.target.value)
  }

  return (
    <div className="App">
      <div>
        <div>
          <input type="file" ref={fileElem} onChange={handleFileChange} />
          <button onClick={handleDownload}>下载</button>
        </div>
        <div>
          <input type="text" placeholder="id" value={songId} onChange={handleChangeId} />
          <button onClick={() => handleSearch(songId)}>搜索</button>
        </div>
      </div>
      <ul className="search-list">
      {
        songDetails.map(item => (
          <li key={item.id}>
            <img width="300" src={item.al.picUrl} alt=""/>
            <p>{item.al.name}</p>
          </li>
        ))
      }
      </ul>
    </div>
  )
}

export default App
