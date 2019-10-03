<template>
  <div>
    <div>
      <div>
        <input type="file" ref="file" @change="handleFileChange">
        <button @click="handleDownload">下载</button>
      </div>
      <div>
        <input type="text" placeholder="id" v-model="songId">
        <button @click="handleSearch(songId)">搜索</button>
      </div>
    </div>
    <ul class="search-list">
      <li v-for="item in songDetails" :key="item.id">
        <img width="300" :src="item.al.picUrl" alt="">
        <p>{{item.al.name}}</p>
      </li>
    </ul>
  </div>
</template>

<script>
import ID3Writer from 'browser-id3-writer'
import '../../public/jsmediatags.min.js'
import axios from 'axios'
import FileSaver from 'file-saver'

export default {
  name: 'HelloWorld',
  data () {
    return {
      songDetails: [],
      songId: ''
    }
  },
  methods: {
    async handleFileChange () {
      const files = this.$refs['file'].files
      if (files.length === 0) {
        return
      }
      const file = files[0]
      this.file = file
      console.log(file)
      this.arrayBuffer = await this.readFile(file)
      // 获取歌曲文件meta
      const tag = await this.jsmediatagsRead(file)
      const { title, album } = tag.tags
      this.title = title
      this.album = album
      this.handleSearch()
    },
    async handleSearch (id) {
      let filteredResultIds = []
      if (!id) {
        // 搜索歌曲
        const searchResult = await axios.get(`/search?keywords=${this.title}&type=1&limit=100`).then(res => res.data.result.songs)
        this.searchResult = searchResult
        // 筛选歌曲列表中专辑一致的歌曲
        const filteredResult = searchResult.filter(item => item.album.name.toLowerCase() === this.album.toLowerCase())
        filteredResultIds = filteredResult.map(item => item.id)
      } else {
        filteredResultIds = [id]
      }
      if (!filteredResultIds.length) {
        alert('未找到歌曲')
        return
      }
      // 获取歌曲详情（封面）默认取第一个
      this.songDetails = await axios.get(`/song/detail?ids=${filteredResultIds.join()}`).then(res => res.data.songs)
      this.songDetail = this.songDetails[0]
      console.log(JSON.parse(JSON.stringify(this.songDetail)))
    },
    async handleDownload () {
      let response = await fetch(this.songDetail.al.picUrl)
      let data = await response.blob()
      let metadata = {
        type: 'image/jpeg'
      }
      let imgFile = new File([data], `${this.songDetail.al.name}.jpg`, metadata)
      const imgArrayBuffer = await this.readFile(imgFile)
      // 添加MP3信息
      const writer = new ID3Writer(this.arrayBuffer)
      writer
        // 封面
        .setFrame('APIC', {
          type: 3,
          data: imgArrayBuffer,
          description: this.songDetail.al.name
        })
        // 专辑
        .setFrame('TALB', this.songDetail.al.name)
        // 年份
        .setFrame('TYER', new Date(this.songDetail.publishTime).getFullYear())
        // title
        .setFrame('TIT2', this.songDetail.name)
        // artist
        .setFrame('TPE1', this.songDetail.ar.map(item => item.name))
      writer.addTag()
      // 下载mp3文件
      const taggedSongBuffer = writer.arrayBuffer
      const blob = writer.getBlob()
      const url = writer.getURL()
      FileSaver.saveAs(blob, this.file.name)
    },
    readFile (file) {
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
    },
    jsmediatagsRead (file) {
      return new Promise((resolve, reject) => {
        window.jsmediatags.read(file, {
          onSuccess (tag) {
            resolve(tag)
          },
          onError (error) {
            reject(error)
          }
        })
      })
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

</style>
