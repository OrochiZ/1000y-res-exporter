import React from 'react';
import { Icon } from 'antd';

class ObjLabel extends React.Component {

    onClick = (e) => {
        this.props.onClick(this.props.obj.header.objId);
    }
    render() {
        const obj = this.props.obj;

        return (
            <div className="obj_label" onClick={this.onClick}>
                <span className="obj_label_eye">
                    {(obj.header.show) ? <Icon type="eye"></Icon> : null}
                </span>
                {obj.header.objId}
            </div>
        )
    }
}

class UnitLibrary extends React.Component {

    onClick = (objId) => {
        if (this.props.onToggleShow) {
            this.props.onToggleShow(objId);
        }
    }

    render() {
        const objList = this.props.objList;
        return (
            <div className="unit_library">
                <header>Library</header>
                <div className="unit_container">
                    {
                        objList.map((obj, index) => {
                            return <ObjLabel onClick={this.onClick} key={index} obj={obj} />
                        })
                    }
                </div>
            </div>
        )
    }
}

export default UnitLibrary;