import React from 'react';

class UnitProperty extends React.Component {
    render() {
        const { mapInfo, camera } = this.props;
        return (
            <div className="map_property">
                <div className="map_info"><span className="lab">Map Size</span>{mapInfo.width} * {mapInfo.height}</div>
                <div><span className="lab">Position</span>{camera.x} : {camera.y}</div>
            </div>
        )
    }
}

export default UnitProperty;