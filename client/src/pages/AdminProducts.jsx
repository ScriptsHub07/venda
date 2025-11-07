import React, { useState } from 'react'

function AdminProducts(){
  const [title,setTitle]=useState('')
  const [price,setPrice]=useState('')
  const [images,setImages]=useState([])
  const [file,setFile]=useState(null)

  async function presignAndUpload(file){
    const key = `products/${Date.now()}-${file.name}`
    const res = await fetch(`/api/uploads/presign?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type)}`)
    const data = await res.json();
    if (!data.ok) throw new Error(data.error||'presign failed')
    // PUT the file
    await fetch(data.url, { method:'PUT', body: file, headers: { 'Content-Type': file.type } })
    // Construct public URL (standard S3 pattern)
    const bucket = process.env.PUBLIC_S3_BUCKET || ''
    const url = data.url.split('?')[0]
    return { url, key: data.key }
  }

  async function addImage(){
    if (!file) return alert('Escolha um arquivo')
    try{
      const up = await presignAndUpload(file)
      setImages([...images, { url: up.url, alt: title }])
      setFile(null)
    }catch(err){ alert(String(err)) }
  }

  async function createProduct(){
    const payload = { title, priceCents: Math.round(parseFloat(price||0)*100), images }
    const res = await fetch('/api/products', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
    const data = await res.json();
    if (!res.ok) return alert(data.error||'Erro')
    alert('Produto criado')
    setTitle(''); setPrice(''); setImages([])
  }

  return (
    <div className="container">
      <h3>Criar produto</h3>
      <div style={{display:'grid',gap:8,maxWidth:520}}>
        <input placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)} />
        <input placeholder="Preço (R$)" value={price} onChange={e=>setPrice(e.target.value)} />
        <div>
          <input type="file" onChange={e=>setFile(e.target.files[0])} />
          <button className="btn" onClick={addImage}>Upload imagem</button>
        </div>
        <div>
          {images.map((img,i)=>(<div key={i} style={{padding:6}}>{img.url}</div>))}
        </div>
        <button className="btn" onClick={createProduct}>Criar</button>
      </div>
    </div>
  )
}

export default AdminProducts
