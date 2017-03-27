import * as React from 'react';
import { connect } from 'dva';
import TopicShape from './Shape';
import TopicFill from './Fill';
import TopicSelectBox from './SelectBox';
import ConnectLine from './ConnectLine';
import TopicTitle from './Title';
import Label from '../InfoItem/Label';

import CalcTopicShape from 'src/calcpath/topicshape';
import {events, selectionsManager, pasteInfoManager, componentMapManager} from 'src/managers';
import * as AddOn from 'src/apptools/addon';
import * as EventTags from 'src/constants/EventTags';
import * as CommonConstant from 'src/constants/Common';
import * as CommonFunc from 'src/apptools/commonfunc';

import { extendTopicInfo, appState } from 'src/interface';

// todo props and state interface
interface TopicProps {
  app: appState
  topicInfo: extendTopicInfo
}

class Topic extends React.Component<TopicProps, any> {

  refs: any;

  constructor() {
    super();

    this.state = {
      selected: false,
      hovered: false
    };

  }

  componentWillMount() {
    componentMapManager.addComponent(this.props.topicInfo.id, this);
  }

  componentWillUnmount() {
    componentMapManager.removeComponent(this.props.topicInfo.id);
    selectionsManager.removeSelection(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const stringify = JSON.stringify.bind(JSON);

    // check state
    const stateHasChanged = stringify(this.state) !== stringify(nextState);
    if (stateHasChanged) return true;

    // check self's props
    const topicInfo = this.props.topicInfo;
    const nextTopicInfo = nextProps.topicInfo;

    const styleHasChanged = stringify(topicInfo.style) !== stringify(nextTopicInfo.style);
    const boundsHasChanged = stringify(topicInfo.bounds) !== stringify(nextTopicInfo.bounds);
    const positionHasChanged = stringify(topicInfo.position) !== stringify(nextTopicInfo.position);
    const titleHasChanged = topicInfo.title !== nextTopicInfo.title;

    const selfPropsHasChanged = styleHasChanged || boundsHasChanged || positionHasChanged || titleHasChanged;
    if (selfPropsHasChanged) return true;


    // check child structure props
    const children = topicInfo.children;
    const nextChildren = nextTopicInfo.children;

    let childShapeClassHasChanged = false;
    if (children && nextChildren) {
      childShapeClassHasChanged = children.some((childInfo, index) => {
        return childInfo.style.shapeClass !== nextChildren[index].style.shapeClass;
      });
    }

    return childShapeClassHasChanged;
  }

  getTopicShapePath() {
    const topicInfo = this.props.topicInfo;
    return CalcTopicShape[topicInfo.style.shapeClass](topicInfo.boxSize);
  }

  // userAgent events
  onTopicClick(e) {
    e.stopPropagation();

    if (this.state.selected === false) {
      (e.ctrlKey || e.metaKey) ? selectionsManager.addSelection(this)
        : selectionsManager.selectSingle(this);
      this.onSelected();
    }

  }

  onTopicDoubleClick() {
    AddOn.editReceiver.show(this);
  }

  onTopicMouseEnter() {
    // if not selected, show hovered box
    if (!this.state.selected) {
      this.setState({hovered: true});
    }
  }

  onTopicMouseOut(e) {
    const targetClass = e.target.getAttribute('class');
    if (targetClass && targetClass.includes('topic-fill') && this.state.hovered) {
      this.setState({hovered: false});
    }
  }

  copyTopicInfo() {
    pasteInfoManager.refreshInfo(this.props.topicInfo.originTopicInfo);
  }

  cutTopicInfo() {
    if (this.getType() === CommonConstant.TOPIC_ROOT) return false;

    pasteInfoManager.refreshInfo(this.props.topicInfo.originTopicInfo);
  }

  pasteTopicInfo() {
    if (!pasteInfoManager.hasInfoStashed()) return;
  }

  // lifecycle events
  onSelected() {
    this.setState({selected: true, hovered: false});
    AddOn.editReceiver.prepare(this);

    events.emit(EventTags.TOPIC_SELECTED, this.props.topicInfo);
  }

  onDeselected() {
    this.setState({selected: false});

    events.emit(EventTags.TOPIC_DESELECTED);
  }

  onUpdateTitle(title) {
    if (title === this.props.topicInfo.title) {
      return false;
    }
  }

  // method for editReceiver
  getTitleClientRect() {
    return this.refs.TopicTitle.refs.title.getBoundingClientRect();
  }

  getTitle() {
    return this.props.topicInfo.title || 'Topic';
  }

  getType() {
    return this.props.topicInfo.type;
  }

  getGroupBoxRect() {
    return this.refs.TopicGroup.querySelector('.topic-select-box').getBoundingClientRect();
  }

  renderInnerItem() {

    let innerGroupWidth = 0;

    const topicInfo = this.props.topicInfo;

    const style = topicInfo.style;
    const title = topicInfo.title == null ? 'Topic' : topicInfo.title;

    const TopicTitleProps = {
      ref: 'TopicTitle',
      title: title,
      fontSize: style.fontSize,
      fontColor: style.fontColor,
      isFontBold: style.isFontBold,
      isFontItalic: style.isFontItalic,
      isFontLineThrough: style.isFontLineThrough
    };

    innerGroupWidth += this.props.topicInfo.titleAreaSize.width;

    const needLabel = topicInfo.label;
    // const isLabelIcon = this.props.infoItem.label === CommonConstant.INFO_ITEM_ICON_MODE;
    const isLabelIcon = false;
    const doRenderIconLabel = needLabel && isLabelIcon;

    let labelX: number;

    if (doRenderIconLabel) {
      innerGroupWidth += 5 + topicInfo.labelBoxSize.width;
      labelX = topicInfo.titleAreaSize.width - innerGroupWidth / 2 + 5;
    }

    return (
      <g className="inner-item-group">
        <TopicTitle {...TopicTitleProps} x={- innerGroupWidth / 2}/>
        {doRenderIconLabel ? <Label topicInfo={topicInfo} displayMode={this.props.app.infoItemDisplay.label} x={labelX}/> : null}
      </g>
    );

  }

  // todo
  renderCardItem() {
    const topicInfo = this.props.topicInfo;
    const needLabel = topicInfo.label;
    // const isLabelCard = this.props.infoItem.label === CommonConstant.INFO_ITEM_CARD_MODE;
    const isLabelCard = true;
    const doRenderCardLabel = needLabel && isLabelCard;

    return (
      <g className="card-item-group">
        {doRenderCardLabel ? <Label topicInfo={topicInfo} displayMode={'card'}/> : null}
      </g>
    );
  }

  render() {

    const {topicInfo} = this.props;

    const TopicGroupProps = {
      ref: 'TopicGroup',
      className: `topic-group ${topicInfo.type}`,
      transform: `translate(${topicInfo.position[0]},${topicInfo.position[1]})`
    };

    const {topicShapePath, topicSelectBoxPath} = this.getTopicShapePath();
    const style = topicInfo.style;

    const TopicFillProps = {
      d: topicShapePath,
      fillColor: style.fillColor
    };

    const TopicShapeProps = {
      d: topicShapePath,
      strokeWidth: style.strokeWidth,
      strokeColor: style.strokeColor
    };

    const TopicBoxGroupProps = {
      className: 'topic-box-group',
      onClick: (e) => this.onTopicClick(e),
      onDoubleClick: () => this.onTopicDoubleClick(),
      onMouseEnter: () => this.onTopicMouseEnter(),
      onMouseOut: (e) => this.onTopicMouseOut(e)
    };

    const TopicSelectBoxProps = {
      d: topicSelectBoxPath,
      selected: this.state.selected,
      hovered: this.state.hovered
    };

    const needConnectLine =
      style.lineClass !== CommonConstant.LINE_NONE &&
      style.lineWidth !== CommonConstant.LINE_WIDTH_NONE &&
      topicInfo.children && topicInfo.children.length;
    const needShape = style.strokeWidth !== CommonConstant.STROKE_WIDTH_NONE;

    return (
      <g {...TopicGroupProps} >
        <g {...TopicBoxGroupProps}>
          {needShape ? <TopicShape {...TopicShapeProps}/> : []}
          <TopicFill {...TopicFillProps}/>
          {this.renderInnerItem()}
        </g>
        <TopicSelectBox {...TopicSelectBoxProps}/>
        {/*{this.renderCardItem()}*/}
        {needConnectLine ? <ConnectLine topicInfo={topicInfo}/> : []}
      </g>
    );
  }
}

const mapStateToProps = ({ app }) => {
  return { app };
};

export default connect(mapStateToProps)(Topic);
