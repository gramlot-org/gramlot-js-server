import {theme} from './theme.mjs';

// Every demo shares the same navigation, source viewer and visual language.
export function createPages({HtmlBuilder, wrapSource}, sourceCode = '') {
  function page(about = false) {
    const builder = new HtmlBuilder('main');
    const root = wrapSource(builder.source);
    root.styleSheet({cssText:theme});
    root.dataSetter({destination:'sourceCode', value:sourceCode});
    root.dataSetter({destination:'sourceHidden', value:true});
    root.dataSetter({destination:'about', value:about});
    root.dataFormula({destination:'aboutHidden', formula:'!about', about:'^about', _on_start:true});
    const shell = root.div({class:'shell'});
    const header = shell.header({class:'topbar'});
    const brand = header.div({class:'brand'});
    brand.img({src:'/assets/gramlot-logo.png',alt:'Gramlot logo',width:64,height:64});
    const identity = brand.div();
    identity.strong('Gramlot');
    identity.span('Esempio di SPA con Gramlot', {class:'brand-subtitle'});
    const nav = header.nav({class:'nav'});
    nav.button('Playground', {id:'nav-playground',class:'nav-tab',action:'this.SET("about", false);'});
    nav.button('Come funziona', {id:'nav-about',class:'nav-tab',action:'this.SET("about", true);'});
    nav.button('Show source', {class:'btn source-button',id:'show-source',action:'this.SET("sourceHidden", false);'});
    const main = shell.main();
    const hero = main.section({class:'hero'});
    hero.span('SINGLE PAGE APPLICATION · NODE.JS', {class:'eyebrow'});
    hero.h1('Una pagina. Tante possibilità.');
    hero.p('Interagisci, esplora il codice e osserva i dati: tutto nella stessa pagina, con Gramlot.');
    hero.span('BUILT WITH GRAMLOT', {class:'badge'});
    {
      const aboutView = main.section({hidden:'^aboutHidden',id:'about-view'});
      const flow = aboutView.div({class:'flow'});
      for (const [step,title,description] of [
        ['01 / DECLARE','Describe the page','Node.js builds a fresh Gramlot Source for each request. Structure, bindings and actions travel together.'],
        ['02 / DELIVER','Keep the server small','Native HTTP delivers the page and shared runtime. No Express, Python process or database is required.'],
        ['03 / INTERACT','Let the browser respond','Data Bags and bindings connect each interaction to the interface. The same Gramlot runtime does the work.'],
      ]) {
        const card = flow.section({class:'card'});
        card.span(step,{class:'step'}); card.h2(title); card.p(description);
      }
      aboutView.p('This is a local experiment. Values belong to the current page and reset when you reload.',{class:'note'});
    }
    {
      root.dataSetter({destination:'name',value:'World'});
      root.dataSetter({destination:'count',value:0});
      root.dataFormula({destination:'greeting',formula:'"Hello, " + name + "!"',name:'^name',_on_start:true});
      const playground = main.div({class:'playground',hidden:'^about',id:'playground-view'});
      const welcome = playground.section({class:'card'});
      welcome.span('01 / MAKE IT PERSONAL',{class:'step'});
      welcome.h2('A little introduction.');
      welcome.p('Your words, reflected in real time.',{class:'muted'});
      wrapSource(welcome.getValue()).label('What should we call you?',{for_:'name',class:'field-label'});
      welcome.input({id:'name',class:'text-input',value:'^name',type:'text',live:true});
      welcome.output('^greeting',{id:'greeting',class:'greeting','aria-live':'polite'});
      const counter = playground.section({class:'card counter-card'});
      counter.span('02 / START SOMETHING',{class:'step'});
      counter.h2('Every click counts.');
      counter.p('Small steps can add up to something good.',{class:'muted'});
      counter.output('^count',{id:'count',class:'counter','aria-live':'polite'});
      counter.button('Increment ↗',{id:'increment',class:'btn',action:'this.SET("count", this.GET("count") + 1);'});
    }
    const footer = shell.footer({class:'footer'});
    footer.span('Live in your browser');
    footer.span('Gramlot × Node.js · A local playground');
    const source = root.section({class:'source-panel',hidden:'^sourceHidden',role:'region','aria-label':'Page source'});
    const bar = source.header({class:'source-header'});
    bar.h2('Page source · pages.mjs');
    bar.button('Close source ×',{id:'close-source',class:'btn',action:'this.SET("sourceHidden", true);'});
    source.p('The actual JavaScript module that declares both demo pages. Shared styling lives in theme.mjs.',{class:'source-caption'});
    source.pre('^sourceCode');
    return {title:'SPA con Gramlot · Node.js',source:builder.source.toTytx()};
  }
  return {'/':()=>page(),'/about':()=>page(true)};
}
