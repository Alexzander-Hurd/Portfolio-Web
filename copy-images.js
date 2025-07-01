import fs from 'fs-extra'
import path from 'path'

const source = path.resolve('./src/content/images')
const dest = path.resolve('./public/images')

fs.copy(source, dest)
.then(() => {
    console.log('Copied successfully')
})
.catch((err) => {
    console.error(err)
})