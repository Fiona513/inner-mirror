import Link from "next/link";

export default function NotFound() {
  return <main className="v3-done"><section><p className="v3-kicker">404 · NOT FOUND</p><h1>这里暂时没有<br />可以看见的东西。</h1><blockquote>回到 Inner Mirror，从此刻重新开始。</blockquote><footer><Link className="v3-primary" href="/">回到首页 <b>→</b></Link></footer></section></main>;
}
