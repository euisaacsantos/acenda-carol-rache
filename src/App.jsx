import { useState, useRef, useEffect, useCallback } from 'react'
import './index.css'
import { trackEvent, appendSck } from './lib/tracking'

// Trocar pela URL real do checkout Hotmart quando disponível.
// Enquanto for string vazia, os CTAs continuam rolando para #investimento.
const HOTMART_CHECKOUT_URL = ''

/* ── Reusable CTA Button ── */
function CTAButton({ children, className = '' }) {
  const handleClick = () => {
    trackEvent('InitiateCheckout', {
      content_name: 'Acenda Sua Luz',
      currency: 'BRL',
    })
  }
  const href = HOTMART_CHECKOUT_URL ? appendSck(HOTMART_CHECKOUT_URL) : '#investimento'
  const isExternal = !!HOTMART_CHECKOUT_URL
  return (
    <a
      href={href}
      {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
      onClick={handleClick}
      className={`inline-block bg-gradient-to-r from-[#90660E] to-[#D8BA67] text-white font-sans font-bold uppercase tracking-wider px-6 md:px-10 py-4 md:py-5 rounded-lg hover:scale-105 hover:from-[#7A550B] hover:to-[#C8A35A] transition-all duration-300 shadow-[0_0_30px_rgba(144,102,14,0.3)] text-sm md:text-base ${className}`}
    >
      {children}
    </a>
  )
}

/* ── FAQ Item ── */
function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-5 text-left cursor-pointer bg-transparent border-none text-white"
      >
        <span className="font-sans font-bold text-base md:text-xl pr-4">{question}</span>
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 text-gold-gradient ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-5' : 'max-h-0'}`}>
        <p className="font-sans font-light text-base leading-relaxed text-white">{answer}</p>
      </div>
    </div>
  )
}

/* ── Tattoo Carousel ── */
function TattooCarousel() {
  const trackRef = useRef(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollStart = useRef(0)
  const autoSpeed = 0.4
  const animRef = useRef(null)
  const offsetRef = useRef(0)
  const lastTime = useRef(null)
  const dragVelocity = useRef(0)
  const lastDragX = useRef(0)
  const lastDragTime = useRef(0)

  const images = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  // Triple the images for seamless loop
  const tripled = [...images, ...images, ...images]

  const animate = useCallback((time) => {
    if (!trackRef.current) return
    if (lastTime.current === null) lastTime.current = time
    const delta = time - lastTime.current
    lastTime.current = time

    if (!isDragging.current) {
      // Apply drag velocity decay
      if (Math.abs(dragVelocity.current) > 0.1) {
        offsetRef.current += dragVelocity.current * delta
        dragVelocity.current *= 0.95
      } else {
        dragVelocity.current = 0
        offsetRef.current -= autoSpeed * delta * 0.06
      }

      // Loop reset
      const track = trackRef.current
      const singleSetWidth = track.scrollWidth / 3
      if (Math.abs(offsetRef.current) >= singleSetWidth) {
        offsetRef.current += singleSetWidth
      }
      if (offsetRef.current > 0) {
        offsetRef.current -= singleSetWidth
      }

      track.style.transform = `translateX(${offsetRef.current}px)`
    }

    animRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [animate])

  const handlePointerDown = (e) => {
    isDragging.current = true
    startX.current = e.clientX
    scrollStart.current = offsetRef.current
    lastDragX.current = e.clientX
    lastDragTime.current = performance.now()
    dragVelocity.current = 0
    trackRef.current.style.cursor = 'grabbing'
  }

  const handlePointerMove = (e) => {
    if (!isDragging.current) return
    const diff = e.clientX - startX.current
    offsetRef.current = scrollStart.current + diff
    trackRef.current.style.transform = `translateX(${offsetRef.current}px)`

    const now = performance.now()
    const dt = now - lastDragTime.current
    if (dt > 0) {
      dragVelocity.current = (e.clientX - lastDragX.current) / dt
    }
    lastDragX.current = e.clientX
    lastDragTime.current = now
  }

  const handlePointerUp = () => {
    isDragging.current = false
    trackRef.current.style.cursor = 'grab'
    lastTime.current = null
  }

  return (
    <div
      className="relative -mt-[120px] md:-mt-[200px] z-10 pb-10 md:pb-16 w-screen left-1/2 -translate-x-1/2 overflow-hidden cursor-grab select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div ref={trackRef} className="flex will-change-transform">
        {tripled.map((_, idx) => (
          <img
            key={idx}
            src="/assets/tatuagens.webp"
            alt="Tatuagens"
            className="flex-shrink-0 h-[280px] md:h-auto w-auto max-w-none md:max-w-full object-contain pointer-events-none"
            draggable={false}
          />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  useEffect(() => {
    trackEvent('PageView')
  }, [])

  // Animações de scroll suaves (não-invasivo: aplica classes via JS)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const root = document.querySelector('.min-h-screen') || document.body
    const sections = root.querySelectorAll('section')

    sections.forEach((section, sIdx) => {
      // Não animar a primeira dobra (hero) — entrada imediata
      if (sIdx === 0) return

      // Títulos e parágrafos: fade-up
      section.querySelectorAll('h1, h2, h3, h4, p, ul, ol, blockquote').forEach((el) => {
        el.classList.add('reveal')
      })

      // Imagens: fade + zoom-out leve
      section.querySelectorAll('img').forEach((el) => {
        el.classList.add('reveal-img')
      })

      // Cards/itens em grids: fade-up com leve stagger
      section.querySelectorAll('.grid > *, .flex.flex-wrap > *').forEach((el, i) => {
        el.classList.add('reveal', 'lift')
        const delay = (i % 4) + 1
        el.classList.add(`reveal-delay-${delay}`)
      })

      // CTAs: glow sutil contínuo
      section.querySelectorAll('a[href="#investimento"], a[target="_blank"]').forEach((el) => {
        if (el.className.includes('from-[#90660E]')) {
          el.classList.add('animate-subtle-glow')
        }
      })
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )

    root.querySelectorAll('.reveal, .reveal-img').forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])
  return (
    <div className="min-h-screen bg-brand-bg text-white overflow-x-hidden">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-40 pb-10 md:py-16 bg-[url('/assets/ASLBG1MOBILE.webp')] md:bg-[url('/assets/ASLBG1DESK.webp')] bg-contain md:bg-cover bg-top md:bg-center bg-no-repeat">
        <div className="absolute inset-0 bg-transparent" />
        <div className="relative max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6 text-center md:text-left">
          <img src="/assets/LOGO ACENDA DOURADO.svg" alt="Acenda Sua Luz" className="h-10 md:h-12 mb-6 md:mb-8 mx-auto md:mx-0" />
          <h1 className="font-serif font-light text-[30px] md:text-[40px] leading-[1.0] mb-2 md:mb-4 md:max-w-[600px]">
            Você já sabe o que precisa mudar.<br className="hidden md:inline" />{' '}
            O problema é que <span className="text-gold-gradient font-medium-force">ninguém te ensinou como.</span>
          </h1>
          <p className="font-sans text-base md:text-xl font-light leading-[1.3] max-w-[800px] md:mx-0 mx-auto mb-6 md:mb-10 text-white md:max-w-[550px]">
            Em <span className="text-white font-bold">30 dias</span>, você vai reprogramar o emocional que hoje sabota seus <span className="text-white font-bold">relacionamentos</span>,
            sua <span className="text-white font-bold">prosperidade</span> e a <span className="text-white font-bold">sua paz</span> — com acompanhamento diário, método <span className="text-white font-bold">100% autoral</span>{' '}
            e embasamento neurocientífico.
          </p>
          <CTAButton className="md:px-20">Quero minha transformação</CTAButton>

          {/* Credenciais */}
          <div className="mt-10 flex flex-col items-stretch md:items-start gap-3 w-full">
            <div className="flex flex-col md:flex-row flex-wrap justify-center md:justify-start gap-3">
              {[
                { icon: <div className="w-[40px] h-[40px] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #90660E, #D8BA67, #90660E)', WebkitMask: "url('/assets/diretrizes-de-direitos-autorais.svg') center/contain no-repeat", mask: "url('/assets/diretrizes-de-direitos-autorais.svg') center/contain no-repeat" }} />, text: 'Método 100% autoral' },
                { icon: <img src="/assets/LOGO HARVARD.svg" alt="Harvard" className="w-[80px] md:w-[140px] h-[80px] md:h-[140px]" />, text: 'Certificada em Harvard' },
              ].map(({ icon, text }) => (
                <span key={text} className="inline-flex items-center justify-center md:justify-start gap-2 border border-brand-gold/15 rounded-md px-3 py-1 font-sans text-xs md:text-sm text-white h-[50px] md:h-[60px] bg-black/40 backdrop-blur-md w-full md:w-auto">
                  {icon}{text}
                </span>
              ))}
            </div>
            <div className="flex flex-col md:flex-row flex-wrap justify-center md:justify-start gap-3">
              {[
                { icon: <img src="/assets/SELO MEC.webp" alt="MEC" className="w-[60px] h-[60px] object-contain" />, text: <span className="leading-tight">Programa com<br className="hidden md:inline" /> certificação MEC</span> },
                { icon: <svg className="w-[40px] h-[40px]" fill="none" viewBox="0 0 24 24" stroke="url(#goldGrad)"><defs><linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#90660E"/><stop offset="50%" stopColor="#D8BA67"/><stop offset="100%" stopColor="#90660E"/></linearGradient></defs><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, text: <span className="leading-tight text-left">11 anos de estudo em<br className="hidden md:inline" /> comportamento humano</span> },
                { icon: <svg className="w-[40px] h-[40px]" fill="none" viewBox="0 0 24 24" stroke="url(#goldGrad2)"><defs><linearGradient id="goldGrad2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#90660E"/><stop offset="50%" stopColor="#D8BA67"/><stop offset="100%" stopColor="#90660E"/></linearGradient></defs><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>, text: <span className="leading-tight">+40.000 vidas<br className="hidden md:inline" /> transformadas</span> },
              ].map(({ icon, text }) => (
                <span key={text} className="inline-flex items-center justify-center md:justify-start gap-2 border border-brand-gold/15 rounded-md px-3 py-1 font-sans text-xs md:text-sm text-white h-[50px] md:h-[60px] bg-black/40 backdrop-blur-md w-full md:w-auto">
                  {icon}{text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SEÇÃO DE DOR ═══════════════ */}
      <section className="relative py-10 md:py-16 bg-brand-bg-light bg-cover bg-center" style={{ backgroundImage: "url('/assets/ASLBG2DESK.webp')" }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] text-center mb-2 md:mb-4">
            Você <span className="text-gold-gradient font-medium-force">reconhece</span> alguma dessas situações?
          </h2>
          <p className="font-sans text-base md:text-lg font-light text-center max-w-[800px] mx-auto mb-8 text-white">
            Você lê livros de autoconhecimento, faz terapia, assiste conteúdo motivacional — e mesmo assim
            sente que algo não avança. Você sabe o que deveria fazer, mas na hora H,
            <strong className="font-bold text-white"> um padrão mais forte fala mais alto.</strong> Um padrão que te faz:
          </p>

          <div className="max-w-[700px] mx-auto bg-white/5 border border-white/10 rounded-xl p-6 space-y-3 mb-10">
            {[
              'Ceder quando deveria se posicionar',
              'Travar quando deveria agir',
              'Depender da validação das pessoas para se sentir bem',
              'Repetir nos relacionamentos o que prometeu que nunca mais ia repetir',
              'Explodir com quem você ama e depois sentir culpa',
              'Trabalhar exaustivamente e nunca ser suficiente',
              'Acordar cansada de ser quem você é',
            ].map((item) => (
              <p key={item} className="font-sans text-base text-white flex items-start gap-3">
                <img src="/assets/ICONE X.svg" alt="" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                {item}
              </p>
            ))}
          </div>

          <div className="max-w-[800px] mx-auto text-center">
            <p className="font-sans text-base md:text-lg font-light text-white mb-4">
              Isso não é fraqueza. Isso é um <strong className="font-bold text-white">emocional mal reprogramado.</strong>
            </p>
            <p className="font-sans text-base md:text-lg font-light text-white">
              E enquanto ele continuar rodando no modo antigo, nenhum livro, nenhum curso e nenhuma força de vontade
              vai ser suficiente para mudar.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════ SEÇÃO DE VIRADA — A SOLUÇÃO ═══════════════ */}
      <section className="py-6 md:py-10">
        <div className="max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
            {/* Imagem */}
            <div className="flex-shrink-0 w-full md:w-[400px]">
              <img src="/assets/ft acenda 2 desktop.webp" alt="Carol Rache" className="w-full h-48 md:h-auto object-cover rounded-2xl" />
            </div>
            {/* Texto */}
            <div className="space-y-6 text-center md:text-left">
              <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] mb-2 md:mb-4">
                O problema não é você.<br /> É que ninguém te deu um <span className="text-gold-gradient font-medium-force">método.</span>
              </h2>
              <p className="font-sans text-base md:text-lg font-light text-white">
                Todo mundo fala que você precisa ter autoestima. Que precisa de inteligência emocional.
                Que precisa colocar limites. Que precisa ser mais calma, mais segura, mais leve, mais madura...
              </p>
              <p className="font-sans text-base md:text-lg font-bold text-white">
                Mas ninguém te explica como.
              </p>
              <p className="font-sans text-base md:text-lg font-light text-white">
                Foi exatamente essa lacuna que <strong className="font-bold text-white">Carol Rache</strong> passou
                11 anos preenchendo — primeiro para se curar, depois para transformar
                mais de 40.000 vidas.
              </p>
              <p className="font-sans text-base md:text-lg font-light text-white">
                O resultado é o <strong className="font-bold text-gold-gradient">Programa Acenda Sua Luz</strong>:
                um método 100% autoral (você não vai encontrar essa abordagem em nenhum outro lugar)
                com embasamento neurocientífico, 11 anos de atuação,
                e certificação reconhecida pelo MEC.
              </p>
              <p className="font-sans text-xl md:text-2xl font-bold text-gold-gradient italic">
                Não é motivação. É método.
              </p>
            </div>
          </div>

          {/* Placeholder depoimentos */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <p className="font-sans text-sm text-white italic mb-4">
                  "Depoimento de transformação #{i} — inserir depoimento real aqui."
                </p>
                <p className="font-sans text-sm font-bold text-gold-gradient">— Nome da Aluna</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PROVA SOCIAL — TATUAGENS ═══════════════ */}
      <section className="pt-4 md:pt-6 bg-brand-bg overflow-hidden">
        <div className="max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6 relative">
          {/* Card que se estende para baixo */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-12 pb-[160px] md:pb-[250px] shadow-[0_20px_60px_rgba(0,0,0,0.4)] text-center">
            {/* Ícone lâmpada */}
            <div className="w-12 h-12 mx-auto mb-6" style={{ background: 'linear-gradient(135deg, #90660E, #D8BA67, #90660E)', WebkitMask: "url('/assets/LAMPADA ACENDA.svg') center/contain no-repeat", mask: "url('/assets/LAMPADA ACENDA.svg') center/contain no-repeat" }} />
            {/* Título */}
            <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] mb-2 md:mb-4">
              Quando um programa realmente muda uma vida,<br className="hidden md:inline" />
              as pessoas não pedem certificado.<br className="md:hidden" /> <span className="text-gold-gradient font-medium-force">Elas tatuam.</span>
            </h2>
            {/* Subtextos */}
            <p className="font-sans text-base md:text-lg font-light text-white mx-auto mb-4 md:whitespace-nowrap">
              São mais de <strong className="font-bold text-white">200 alunas</strong> que escolheram eternizar o símbolo do Acenda na pele.
            </p>
            <p className="font-sans text-base md:text-lg font-light text-white max-w-[550px] mx-auto">
              Não porque foram mandadas. Não porque era tendência.<br />
              Mas porque depois do Acenda, elas ganharam uma vida nova e quiseram
              carregar esse marco para sempre.
            </p>
          </div>

          {/* Carrossel infinito */}
          <TattooCarousel />
        </div>
      </section>

      {/* ═══════════════ DEPOIMENTOS BLOCO 1 ═══════════════ */}
      <section className="-mt-2 md:-mt-3 pb-10 md:pb-16">
        <div className="max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] text-center mb-2 md:mb-4">
            Veja o que dizem quem já passou pelo Acenda:
          </h2>

          {/* Depoimento destaque (Cicarelli) */}
          <div className="bg-gradient-to-r from-[#90660E]/10 to-[#D8BA67]/5 border border-brand-gold/30 rounded-2xl p-8 md:p-12 max-w-[800px] mx-auto mb-8">
            <p className="font-sans text-base md:text-lg italic text-white mb-4">
              "[Inserir depoimento da Cicarelli — destaque visual por ser figura pública]"
            </p>
            <p className="font-sans font-bold text-gold-gradient">— Nome da Figura Pública</p>
          </div>

          {/* Depoimentos adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[900px] mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <p className="font-sans text-sm text-white italic mb-4">
                  "Depoimento adicional #{i} — inserir depoimento real com foto e nome."
                </p>
                <p className="font-sans text-sm font-bold text-gold-gradient">— Nome da Aluna</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ O QUE VOCÊ VAI TRANSFORMAR ═══════════════ */}
      <section className="relative py-10 md:py-16 bg-white text-brand-dark">
        <div className="relative max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] text-center mb-4">
            Nos próximos 30 dias, você será acompanhada<br className="hidden md:inline" />{' '}
            diariamente, pela<br className="md:hidden" /> <span className="text-gold-gradient font-medium-force">Carol Rache.</span>
          </h2>
          <p className="font-sans text-xl md:text-2xl font-bold text-center text-gold-gradient italic mb-10">
            Não é um curso. É um programa com acompanhamento.
          </p>
          <p className="font-sans text-base md:text-lg font-light text-center text-brand-dark mx-auto mb-10 md:whitespace-nowrap">
            Você não vai entrar sozinha, receber uma lista de vídeos e torcer para ter disciplina.
          </p>

          <h3 className="font-serif font-light text-[26px] md:text-3xl leading-[1.1] md:leading-[1.15] text-center mb-8">
            Como é sua rotina no Acenda:
          </h3>

          {/* Timeline horizontal — linha 1 (3 itens) */}
          <div className="relative mb-10">
            {/* Linha horizontal — só desktop */}
            <div className="hidden md:block absolute top-[18px] left-0 right-0 h-px bg-gradient-to-r from-[#90660E] via-[#D8BA67] to-[#90660E]" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>, title: '30 minutos por dia, pelo app', text: 'Todos os dias você recebe exatamente o que precisa fazer. Sem precisar pensar. Sem depender da sua motivação. Dia 1, dia 2, dia 3... é só seguir.', img: '/assets/ft app acenda.webp' },
                { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>, title: 'Grupo de WhatsApp com Carol e o time', text: 'Dúvidas respondidas em tempo real. Você nunca vai travar sem ter para quem recorrer.', img: '/assets/ft grupo acenda.webp' },
                { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>, title: <span className="md:whitespace-nowrap">Mentoria Semanal ao Vivo com Carol Rache</span>, text: 'Toda semana, um encontro para impulsionar sua transformação, trabalhar o que surgiu e manter o momentum.', img: '/assets/ft mentoria semanal acenda.webp' },
              ].map(({ icon, title, text, img }) => (
                <div key={title} className="flex flex-col items-center text-center relative">
                  {/* Ícone sobre a linha */}
                  <div className="w-9 h-9 rounded-full bg-white border border-[#D8BA67] flex items-center justify-center text-[#90660E] shadow-[0_0_12px_rgba(144,102,14,0.3)] z-10">
                    {icon}
                  </div>
                  {/* Linha conectando ícone à imagem */}
                  <div className="w-px h-6 bg-gradient-to-b from-[#D8BA67] to-[#D8BA67]/30" />
                  {/* Imagem */}
                  {img ? (
                    <div className="w-full aspect-[4/3] rounded-xl mb-6 flex items-center justify-center overflow-hidden">
                      <img src={img} alt={typeof title === 'string' ? title : ''} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/3] bg-white/5 border border-white/10 rounded-xl mb-6 flex items-center justify-center">
                      <p className="font-sans text-white/30 text-sm">[Imagem]</p>
                    </div>
                  )}
                  <h4 className="font-sans font-bold text-base mb-2">{title}</h4>
                  <p className="font-sans text-sm font-light text-brand-dark leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline — linha 2 (LIZ) + comparativos ao lado */}
          <div className="relative">
            <div className="hidden md:block absolute top-[18px] left-0 right-0 h-px bg-gradient-to-r from-[#90660E] via-[#D8BA67] to-[#90660E]" />
            <div className="flex flex-col md:flex-row gap-8">
              {/* LIZ card */}
              <div className="flex flex-col items-center text-center md:w-1/3">
                <div className="w-9 h-9 rounded-full bg-white border border-[#D8BA67] flex items-center justify-center text-[#90660E] shadow-[0_0_12px_rgba(144,102,14,0.3)] z-10">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
                </div>
                <div className="w-px h-6 bg-gradient-to-b from-[#D8BA67] to-[#D8BA67]/30" />
                <div className="w-full aspect-[4/3] rounded-xl mb-6 flex items-center justify-center overflow-hidden">
                  <img src="/assets/ft liz acenda.webp" alt="LIZ mentora virtual" className="w-full h-full object-contain" />
                </div>
                <h4 className="font-sans font-bold text-base mb-2">Acesso à LIZ, sua mentora virtual 24h</h4>
                <p className="font-sans text-sm font-light text-brand-dark leading-relaxed">
                  A Liz é uma IA treinada pessoalmente por Carol com o método do Acenda.
                  Não é um ChatGPT genérico. É como ter uma terapeuta disponível a qualquer hora.
                </p>
              </div>
              {/* Comparativo + depoimentos ao lado, alinhados com a imagem */}
              <div className="flex flex-col gap-4 md:w-2/3 md:mt-[54px] md:aspect-[8/3]">
                <div className="bg-brand-dark/5 border border-brand-dark/10 rounded-2xl p-8 flex items-center justify-center flex-1 min-h-0">
                  <p className="font-sans text-brand-dark/40 text-center">[Inserir comparativo visual: mesma pergunta feita ao GPT vs. à LIZ]</p>
                </div>
                <div className="hidden md:block rounded-2xl overflow-hidden flex-1 min-h-0">
                  <img src="/assets/ft depoimentos acenda.webp" alt="Depoimentos sobre a LIZ" className="w-full h-full object-cover" />
                </div>
                <div className="md:hidden flex flex-col gap-4">
                  {[1,2,3,4].map((n) => (
                    <img key={n} src={`/assets/depo${n} acenda.webp`} alt={`Depoimento ${n}`} className="w-full h-auto rounded-2xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ ALÉM DOS 30 DIAS ═══════════════ */}

      <section className="py-10 md:py-16">
        <div className="max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6 text-center">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] mb-4">
            Em um mês, você se transforma.<br className="hidden md:inline" />{' '}
            Em um ano, você transforma <span className="text-gold-gradient font-medium-force">todas as áreas da sua vida.</span>
          </h2>
          <div className="mx-auto space-y-4 mb-10">
            <p className="font-sans text-base md:text-lg font-bold text-white md:whitespace-nowrap">
              Depois dos 30 dias de reprogramação, você não fica desamparada.
            </p>
            <p className="font-sans text-base md:text-lg font-light text-white md:whitespace-nowrap">
              Seu acesso a todo o conteúdo dura <strong className="font-bold text-white">1 ano</strong> — com tempo de sobra para revisar tudo quantas vezes precisar.
            </p>
            <p className="font-sans text-base md:text-lg font-light text-white">
              E ao longo desse ano, você continua tendo encontros semanais com Carol e o time<br className="hidden md:inline" />{' '}
              para acompanhar cada nova fase da sua transformação.
            </p>
            <hr className="border-t border-white/30 my-6" />
            <h3 className="font-sans font-bold text-[20px] md:text-[24px] leading-[1.1] md:leading-[1.15] text-center">
              O Acenda tem tudo que você precisa para destravar qualquer área da vida.
            </h3>
            <p className="font-sans text-base md:text-lg font-light text-white text-center">
              Depois dos 30 dias, você será direcionada para as trilhas que fazem mais sentido para o seu momento:
            </p>
          </div>

          {/* Trilhas — mobile: grid simples 2 colunas */}
          <div className="md:hidden flex flex-col gap-4">
            {[
              'Autoestima', 'Relacionamentos', 'Prosperidade', 'Propósito & Talentos',
              'Comunicação', 'Produtividade', 'Detox Alimentar', 'Treinos e Yoga',
              'Meditações Guiadas', 'Sound Healing', 'Energia Fem. & Masc.', 'Imagem Pessoal',
            ].map((trilha) => {
              const trilhaImg = { 'Autoestima': '/assets/ft autoestima acenda.webp', 'Relacionamentos': '/assets/ft relacionamentos acenda.webp', 'Prosperidade': '/assets/ft prosperidade acenda.webp', 'Propósito & Talentos': '/assets/ft proposito e talentos acenda.webp', 'Comunicação': '/assets/ft comunicacao acenda.webp', 'Produtividade': '/assets/ft produtividade acenda.webp', 'Treinos e Yoga': '/assets/ft treinos e yoga acenda.webp', 'Meditações Guiadas': '/assets/ft meditacao guiada acenda.webp', 'Detox Alimentar': '/assets/ft detox acenda.webp', 'Sound Healing': '/assets/ft sound healing acenda.webp', 'Energia Fem. & Masc.': '/assets/ft energia fem e masc acenda.webp', 'Imagem Pessoal': '/assets/ft imagem pessoal acenda.webp' }[trilha];
              return (
              <div key={trilha} className="flex flex-col items-center text-center">
                <div className="w-full h-64 rounded-xl mb-3 overflow-hidden flex items-center justify-center bg-white/5 border border-white/10">
                  {trilhaImg ? (
                    <img src={trilhaImg} alt={trilha} className="w-full h-full object-cover" />
                  ) : (
                    <p className="font-sans text-white/30 text-xs">[Imagem]</p>
                  )}
                </div>
                <p className="font-sans text-base font-bold text-white">{trilha}</p>
              </div>
              );
            })}
          </div>

          {/* Trilhas — desktop: linha do tempo */}
          <div className="hidden md:block relative">
          {[
            ['Autoestima', 'Relacionamentos', 'Prosperidade'],
            ['Propósito & Talentos', 'Comunicação', 'Produtividade'],
            ['Detox Alimentar', 'Treinos e Yoga', 'Meditações Guiadas'],
            ['Sound Healing', 'Energia Fem. & Masc.', 'Imagem Pessoal'],
          ].map((row, idx) => (
            <div key={idx} className="relative mb-6">
              {(idx === 0 || idx === 2) && <div className="absolute -right-16 top-[18px] w-px bg-[#D8BA67] z-0" style={{ height: 'calc(100% + 24px)' }} />}
              {idx === 1 && <div className="absolute -left-16 top-[18px] w-px bg-[#D8BA67] z-0" style={{ height: 'calc(100% + 24px)' }} />}
              {idx === 3 && (
                <div className="absolute -left-16 top-[18px] -translate-x-1/2 -translate-y-1/2 z-10 flex">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#90660E] to-[#D8BA67] animate-ping opacity-30" />
                  <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#90660E] to-[#D8BA67] flex items-center justify-center shadow-[0_0_15px_rgba(144,102,14,0.4)]">
                    <div className="w-5 h-5" style={{ background: 'white', WebkitMask: "url('/assets/LAMPADA ACENDA.svg') center/contain no-repeat", mask: "url('/assets/LAMPADA ACENDA.svg') center/contain no-repeat" }} />
                  </div>
                </div>
              )}
              <div className={`absolute top-[18px] h-px bg-gradient-to-r from-[#90660E] via-[#D8BA67] to-[#90660E] ${
                idx === 0 ? '-left-[calc((100vw-1140px)/2)] -right-16' :
                idx === 1 ? '-left-16 -right-16' :
                idx === 2 ? '-left-16 -right-16' :
                '-left-16 -right-16'
              }`} />
              <div className="grid grid-cols-3 gap-6">
                {row.map((trilha) => {
                  const trilhaImg = { 'Autoestima': '/assets/ft autoestima acenda.webp', 'Relacionamentos': '/assets/ft relacionamentos acenda.webp', 'Prosperidade': '/assets/ft prosperidade acenda.webp', 'Propósito & Talentos': '/assets/ft proposito e talentos acenda.webp', 'Comunicação': '/assets/ft comunicacao acenda.webp', 'Produtividade': '/assets/ft produtividade acenda.webp', 'Treinos e Yoga': '/assets/ft treinos e yoga acenda.webp', 'Meditações Guiadas': '/assets/ft meditacao guiada acenda.webp', 'Detox Alimentar': '/assets/ft detox acenda.webp', 'Sound Healing': '/assets/ft sound healing acenda.webp', 'Energia Fem. & Masc.': '/assets/ft energia fem e masc acenda.webp', 'Imagem Pessoal': '/assets/ft imagem pessoal acenda.webp' }[trilha];
                  return (
                  <div key={trilha} className="flex flex-col items-center text-center">
                    <div className="w-9 h-9 rounded-full bg-black border border-[#D8BA67] flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-br from-[#90660E] to-[#D8BA67]" />
                    </div>
                    <div className="w-px h-4 bg-gradient-to-b from-[#D8BA67] to-[#D8BA67]/30" />
                    <div className="w-full aspect-square rounded-xl mb-3 overflow-hidden flex items-center justify-center bg-white/5 border border-white/10">
                      {trilhaImg ? (
                        <img src={trilhaImg} alt={trilha} className="w-full h-full object-cover" />
                      ) : (
                        <p className="font-sans text-white/30 text-xs">[Imagem]</p>
                      )}
                    </div>
                    <p className="font-sans text-lg font-bold text-white">{trilha}</p>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
          </div>
          <p className="font-sans text-[18px] md:text-[24px] font-bold text-gold-gradient mt-14 italic">
            Um único lugar.<br className="md:hidden" /> Todas as áreas da sua vida.
          </p>
        </div>
      </section>

      {/* ═══════════════ RESUMO + INVESTIMENTO ═══════════════ */}
      <section id="investimento" className="relative pt-2 md:pt-4 pb-10 md:pb-16 bg-brand-bg-light bg-cover bg-center" style={{ backgroundImage: "url('/assets/ASLBG4DESK.webp')" }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6">
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12 pt-[60px] md:pt-[340px] max-w-[900px] mx-auto mt-[90px] md:mt-[150px]">
            <img src="/assets/mockup acenda.webp" alt="Acenda Sua Luz" className="absolute left-1/2 -translate-x-1/2 -top-[200px] md:-top-[280px] w-[140%] max-w-[900px] md:max-w-[1000px] pointer-events-none" />
            <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] text-center mb-6 md:mb-10">
              Ao entrar no <span className="text-gold-gradient">Acenda Sua Luz</span>, você recebe:
            </h2>
            <div className="flex flex-col gap-10 items-center">
              {/* Lista */}
              <div className="max-w-[580px] w-full divide-y divide-white/10 mx-auto">
              {[
                'Acesso completo ao Programa Acenda Sua Luz (por 1 ano)',
                'Os 30 dias de reprogramação mental e emocional com acompanhamento diário',
                'Grupo exclusivo de WhatsApp com Carol e o time',
                'Mentorias semanais ao vivo',
                'Acesso ilimitado à LIZ, sua mentora virtual com IA treinada no método',
                'Todas as trilhas e módulos do programa',
                'Certificação reconhecida pelo MEC',
              ].map((item) => (
                <p key={item} className="font-sans text-base md:text-lg text-white flex items-start gap-3 py-3">
                  <img src="/assets/ICONE CHECK.svg" alt="" className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  {item}
                </p>
              ))}
            </div>

            {/* Oferta embaixo */}
            <div className="w-full max-w-[680px]">
              <div className="bg-black/60 backdrop-blur-md border-2 border-brand-gold/40 rounded-3xl p-4 md:p-10 text-center">
                <h3 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] mb-4 md:whitespace-nowrap">
                  Tudo isso por menos de <br className="md:hidden" /><span className="text-gold-gradient">R$ 10 por dia.</span>
                </h3>
                <div className="space-y-3 mb-6">
                  <p className="font-sans text-base md:text-lg font-light text-white">
                    Já parou para pensar quanto você gasta em coisas que não mudam a sua vida?
                  </p>
                  <p className="font-sans text-base md:text-lg font-light text-white">
                    Já parou para calcular o custo real de continuar repetindo os padrões que te travam — nos relacionamentos, no trabalho, na sua autoestima?
                  </p>
                  <p className="font-sans text-base md:text-lg font-bold text-white">
                    E se daqui a 30 dias você fosse mais segura, mais leve, mais próspera e mais madura?
                  </p>
                </div>
                <CTAButton className="w-full mt-6"><span className="md:hidden">Quero começar<br />agora!</span><span className="hidden md:inline">Quero começar agora!</span></CTAButton>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ GARANTIA ═══════════════ */}
      <section className="relative pt-4 md:pt-6 pb-10 md:pb-16 bg-brand-bg-light bg-cover bg-center" style={{ backgroundImage: "url('/assets/ASLBG4DESK.webp')" }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl px-6 py-8 md:px-12 md:py-12 max-w-[900px] mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
            <div className="flex-shrink-0">
              <img src="/assets/SELO GARANTIA.svg" alt="Garantia 7 dias" className="w-[220px] md:w-[320px]" />
            </div>
            <div className="text-center md:text-left space-y-4">
              <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] mb-2 md:mb-4">
                Seu investimento é<br className="md:hidden" /> <span className="text-gold-gradient">100% sem risco.</span>
              </h2>
              <p className="font-sans text-base md:text-lg font-light text-white">
                Se nos primeiros <strong className="font-bold text-white">7 dias</strong> você sentir que o Acenda não é para você,
                basta pedir o reembolso. Devolução integral, sem perguntas, sem burocracia.
              </p>
              <p className="font-sans text-base md:text-lg font-light text-white md:whitespace-nowrap">
                Você entra, experimenta por uma semana — e só fica se quiser.
              </p>
              <p className="font-sans text-base md:text-lg font-light text-white">
                Se não ficar: não perdeu nenhum real e ainda ganhou 7 dias de acesso ao programa.
              </p>
              <p className="font-sans text-xl md:text-2xl font-bold text-gold-gradient mt-6">
                É completamente sem risco.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ DEPOIMENTOS BLOCO 2 ═══════════════ */}
      <section className="py-10 md:py-16">
        <div className="max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] text-center mb-2 md:mb-4">
            Mais histórias reais de transformação:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[900px] mx-auto">
            {['Autoestima', 'Relacionamento', 'Prosperidade', 'Corpo'].map((tema) => (
              <div key={tema} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <span className="inline-block border border-brand-gold/15 rounded-md px-3 py-1 text-xs font-sans text-gold-gradient mb-3">
                  {tema}
                </span>
                <p className="font-sans text-sm text-white italic mb-4">
                  "[Inserir depoimento sobre {tema.toLowerCase()} — com foto e nome]"
                </p>
                <p className="font-sans text-sm font-bold text-gold-gradient">— Nome da Aluna</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ QUEM É CAROL RACHE ═══════════════ */}
      <section className="py-10 md:py-16 bg-white">
        <div className="max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] text-center text-brand-dark mb-2 md:mb-4">
            A mentora<br className="md:hidden" /> por trás do método:
          </h2>
          <div className="flex flex-col-reverse md:flex-row gap-8 md:gap-12 items-center mt-6 md:mt-0">
            {/* Bio */}
            <div className="md:w-[55%] space-y-6">
              <h3 className="font-serif font-light text-3xl md:text-[48px] text-brand-dark">Carol Rache</h3>
              <div className="space-y-4 mb-6">
                <p className="font-sans text-base md:text-lg text-brand-dark/70">
                  Sou fundadora do Grupo Namah e criadora do Acenda Sua Luz. Dediquei mais de uma década da minha vida ao estudo profundo do comportamento humano – atualmente cursando a Certificação em Comportamento Humano de Harvard e compartilhando conhecimento como colunista da Forbes.
                </p>
                <p className="font-sans text-base md:text-lg text-brand-dark/70">
                  Uni toda minha formação em neurociência e certificações internacionais à minha própria jornada de transformação para criar métodos que realmente funcionam. Não ofereço colo – ofereço cura. E é assim que já impactei <strong className="font-bold text-brand-dark">mais de 40 mil vidas através do Acenda</strong>, hoje um dos maiores programas de inteligência emocional do Brasil, certificado pelo MEC.
                </p>
                <p className="font-sans text-base md:text-lg text-brand-dark/70">
                  Lidero uma comunidade de milhares de pessoas com teorias autorais e uma única missão: provocar transformações reais e profundas em quem está disposto a fazer o trabalho interno necessário.
                </p>
              </div>
            </div>
            {/* Foto placeholder */}
            <div className="md:w-[45%]">
              <div className="rounded-lg shadow-2xl aspect-[5/6] md:aspect-[3/4] overflow-hidden">
                <img src="/assets/ft carol bio acenda.webp" alt="Carol Rache" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Credenciais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-10">
            {[
              { icon: <img src="/assets/diretrizes-de-direitos-autorais.svg" alt="" className="w-12 h-12" style={{ filter: 'invert(73%) sepia(46%) saturate(389%) hue-rotate(5deg) brightness(92%) contrast(86%)' }} />, text: <span>Criadora de um método<br/>100% autoral validado por<br/>mais de 40 mil mulheres</span> },
              { icon: <svg className="w-12 h-12 text-[#D8BA67]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, text: <span>11 anos estudando<br/>comportamento humano</span> },
              { icon: <img src="/assets/LOGO HARVARD PRETO.webp" alt="Harvard" className="w-16 md:w-24 h-16 md:h-24 object-contain" />, text: <span>Certificada pela universidade<br/>mais reconhecida do mundo: Harvard</span> },
              { icon: <img src="/assets/SELO MEC.webp" alt="MEC" className="w-16 md:w-24 h-16 md:h-24 object-contain" />, text: <span>Programa com certificação<br/>reconhecida pelo MEC</span> },
              { icon: <img src="/assets/LOGO FORBES.svg" alt="Forbes" className="w-16 md:w-24 h-16 md:h-24" style={{ filter: 'brightness(0)' }} />, text: 'Colunista Forbes' },
              { icon: <img src="/assets/LOGO O TEMPO.webp" alt="O Tempo" className="w-16 md:w-24 h-16 md:h-24 object-contain" />, text: 'Colunista Jornal O Tempo' },
            ].map(({ icon, text }, i) => (
              <div key={i} className="font-sans text-sm text-black flex items-center justify-center gap-3 border border-brand-dark/15 rounded-md px-4 py-2 h-[80px] md:h-[100px] bg-brand-dark/5 backdrop-blur-md">
                <span className="flex-shrink-0">{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section className="py-10 md:py-16">
        <div className="max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] text-center mb-2 md:mb-4">
            Ainda tem dúvida? Aqui estão as respostas:
          </h2>
          <div className="max-w-[800px] mx-auto">
            <FAQItem
              question="Preciso ter muita disciplina para seguir o programa?"
              answer="Não. Todos os dias você recebe exatamente o que precisa fazer. Não depende de você lembrar, planejar ou se motivar. Nós fazemos esse papel por você."
            />
            <FAQItem
              question="Quanto tempo preciso por dia?"
              answer="30 minutos. Só. (Em vários dias, até menos que isso!)"
            />
            <FAQItem
              question="Funciona para quem já fez terapia?"
              answer="Sim. O Acenda e a terapia se complementam. Muitas alunas relatam que avançaram mais em 30 dias do programa do que em anos de processo terapêutico. Outras decidiram largar a terapia depois do Acenda porque ganharam autonomia emocional e passaram a conseguir resolver seus problemas com maturidade, sozinhas."
            />
            <FAQItem
              question="Posso fazer mesmo tendo uma rotina muito corrida?"
              answer="Sim. O programa foi desenhado para caber na vida corrida."
            />
            <FAQItem
              question="E se eu não conseguir acompanhar no ritmo dos 30 dias?"
              answer="Você tem 1 ano de acesso a todo o conteúdo. Pode retomar, revisar e refazer quantas vezes precisar."
            />
            <FAQItem
              question="Vou receber um certificado?"
              answer="Sim. Ao concluir o programa, você recebe certificação reconhecida pelo MEC."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA FINAL ═══════════════ */}
      <section className="py-10 md:py-16 bg-gradient-to-b from-brand-bg-light to-brand-bg">
        <div className="max-w-[350px] md:max-w-[1140px] mx-auto px-4 md:px-6 text-center">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] leading-[1.1] md:leading-[1.15] mb-2 md:mb-4">
            Sua mentalidade determina<br className="md:hidden" /> sua <span className="text-gold-gradient font-medium-force">realidade.</span>
          </h2>
          <div className="max-w-[600px] mx-auto space-y-4 mb-10">
            <p className="font-sans text-base md:text-lg font-light text-white">
              Você pode continuar tentando sozinha — sem mapa, sem método, sem acompanhamento.
            </p>
            <p className="font-sans text-base md:text-lg font-bold text-white">
              Ou você pode decidir ser o seu principal projeto e priorizar sua transformação.
            </p>
          </div>
          <CTAButton className="mb-6">Quero começar minha transformação</CTAButton>
          <p className="font-sans text-sm text-white/50">
            Garantia de 7 dias. Sem risco. Sem burocracia.
          </p>
        </div>
      </section>

      {/* ═══════════════ RODAPÉ ═══════════════ */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-[350px] md:max-w-[1140px] mx-auto px-4 text-center">
          <p className="font-sans text-sm text-white/40">
            © Carol Rache — Programa Acenda Sua Luz
          </p>
        </div>
      </footer>
    </div>
  )
}
