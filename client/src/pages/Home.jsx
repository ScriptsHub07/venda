import React, { useEffect, useState } from 'react'

function Home(){
  const [products, setProducts] = useState([])
  useEffect(()=>{fetch('/api/products').then(r=>r.json()).then(setProducts)},[])
  return (
    <div className="container">
      <header className="header">
        <h1>Loja Preto & Branco</h1>
        <div>
          <a href="/cart">Carrinho</a>
          {' '}|{' '}
          <a href="/api/auth/google">Entrar com Google</a>
        </div>
      </header>

      <section className="grid">
        {products.map(p=> (
          <article className="card" key={p._id}>
            <div className="img">{p.images && p.images[0] ? <img src={p.images[0].url} alt={p.images[0].alt} style={{maxHeight:140}}/> : 'Imagem'}</div>
            <h3>{p.title}</h3>
            <p className="small-muted">{p.description}</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
              <strong>{(p.priceCents/100).toFixed(2)} R$</strong>
              <button className="btn" onClick={()=>{
                const cart = JSON.parse(localStorage.getItem('cart')||'[]');
                const exists = cart.find(i=>i.product===p._id);
                if (exists){ exists.quantity+=1 } else { cart.push({ product:p._id, title:p.title, quantity:1, checked:true }) }
                localStorage.setItem('cart', JSON.stringify(cart));
                alert('Adicionado ao carrinho');
              }}>Adicionar</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

export default Home
