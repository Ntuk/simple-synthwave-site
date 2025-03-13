import './Delorean.scss';

const Delorean = () => {
  return (
    <div className="delorean">
      <div className="mirror-left"></div>
      <div className="mirror-right"></div>
      <div className="delorean-cases">
        <div className="wheel-case-left"></div>
        <div className="wheel-case-right"></div>
        <div className="wheel-left"></div>
        <div className="wheel-right"></div>
      </div>
      <div className="delorean-top">
        <div className="top-lines-on-top"></div>
        <div className="top-lines-on-top right"></div>
        <div className="rear-window"></div>
        <div className="lights">
          <div className="lights-frame"></div>
          <div className="red-light-left"></div>
          <div className="red-light-right"></div>
          <div className="id-container">
            <div className="id"></div>
          </div>
          <div className="red-reflection"></div>
        </div>
        <div className="bumper-light-reflection"></div>
        <div className="bumper-light-reflection right"></div>
      </div>
      <div className="bumper">
        <div className="bumper-reflection"></div>
        <div className="bumper-logo"></div>
        <div className="bumper-hole-1"></div>
        <div className="bumper-hole-2"></div>
        <div className="dashes"></div>
      </div>
      <div className="shadow"></div>
    </div>
  );
}

export default Delorean;
