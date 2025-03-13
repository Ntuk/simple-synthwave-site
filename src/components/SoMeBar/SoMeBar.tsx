import { FaDiscord, FaEnvelope, FaFacebook, FaGithub, FaInstagram, FaLinkedin, FaTwitter } from "react-icons/fa";
import './SoMeBar.scss';

export function SoMeBar() {
  return (
    <div className={"some"}>
      <a target={'_blank'} rel={'noreferrer'} href={'https://github.com/Ntuk'}><FaGithub /></a>
      <a target={'_blank'} rel={'noreferrer'} href={'https://www.facebook.com/nico.tukiainen'}><FaFacebook /></a>
      <a target={'_blank'} rel={'noreferrer'} href={'https://www.instagram.com/nicotuk/'}><FaInstagram /></a>
      <a target={'_blank'} rel={'noreferrer'} href={'https://www.linkedin.com/in/nico-tukiainen'}><FaLinkedin /></a>
      <a target={'_blank'} rel={'noreferrer'} href={'https://discordapp.com/users/ntuk#2369'}><FaDiscord /></a>
      <a target={'_blank'} rel={'noreferrer'} href={'https://twitter.com/NicoTukiainen'}><FaTwitter /></a>
      <a href={'mailto:nico.tukiainen@gmail.com'}><FaEnvelope /></a>
    </div>
  );
}

export default SoMeBar;
