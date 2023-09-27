/*
 * This file is part of KubeSphere Console.
 * Copyright (C) 2019 The KubeSphere Console Authors.
 *
 * KubeSphere Console is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * KubeSphere Console is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with KubeSphere Console.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from 'react'
import { reaction } from 'mobx'
import { Link } from 'react-router-dom'
import { get } from 'lodash'

import { Avatar, Status } from 'components/Base'
import Banner from 'components/Cards/Banner'
import withList, { ListPage } from 'components/HOCs/withList'
import Table from 'components/Tables/List'

import { getLocalTime, getDisplayName } from 'utils'
import { ICON_TYPES } from 'utils/constants'

import S2IBuilderStore from 'stores/s2i/builder'
import { inject, observer, Provider } from 'mobx-react'
@inject('devopsStore')
@withList({
  store: new S2IBuilderStore('s2ibuilders'),
  module: 's2ibuilders',
  name: 'IMAGE_BUILDER',
})
export default class ImageBuilders extends React.Component {
  get store() {
    return this.props.store
  }
  // 组件挂载后的操作，创建一个MobX反应（reacttion），
  //在WrappedComponent变化的时候进行一些操作，比如设定设定定时器刷新列表等
  componentDidMount() {
    this.freshDisposer = reaction(
      () => this.store.list.isLoading,
      () => {
        const isRunning = this.store.list.data.some(
          detail => get(detail, 'status.lastRunState', 'Running') === 'Running'
        )
        clearTimeout(this.freshTimer)
        if (isRunning) {
          this.freshTimer = setTimeout(this.handleFresh, 4000)
        }
      },
      { fireImmediately: true }
    )
  }
  //组件卸载钱，清理之前创建的定时器
  componentWillUnmount() {
    this.freshDisposer && this.freshDisposer()
    clearTimeout(this.freshTimer)
  }
  // 定义了一个数组，包含用于列表项操作的配置信息，比如编辑和删除
  get itemActions() {
    const { trigger, name } = this.props
    return [
      {
        key: 'edit',
        icon: 'pen',
        text: t('EDIT_INFORMATION'),
        action: 'edit',
        onClick: item =>
          trigger('resource.baseinfo.edit', {
            detail: item,
          }),
      },
      {
        key: 'delete',
        icon: 'trash',
        text: t('DELETE'),
        action: 'delete',
        onClick: item =>
          trigger('resource.delete', {
            type: name,
            detail: item,
          }),
      },
    ]
  }
  //定义了一个函数，返回展示在列表中的列配置，包括名称、状态、类型、服务、创建时间等
  getColumns = () => {
    const { prefix, module } = this.props
    return [
      //列表名称栏
      {
        title: t('NAME'),
        dataIndex: 'name',
        render: (name, record) => (
          <Avatar
            icon={ICON_TYPES[module]}
            iconSize={40}
            title={getDisplayName(record)}
            desc={
              record.serviceName
                ? t('BUILD_IMAGE_FOR_SERVICE', {
                  service: record.serviceName,
                })
                : '-'
            }
            to={`${prefix}/${name}`}
          />
        ),
      },
      //状态
      {
        title: t('STATUS'),
        dataIndex: 'status',
        isHideable: true,
        width: '15%',
        render: status => {
          let _status = get(status, 'lastRunState', '')
          _status = _status === 'Running' ? 'Building' : _status
          return (
            <Status
              name={t(_status.toUpperCase() || 'NOT_RUNNING_YET')}
              type={_status || 'Unknown'}
              flicker
            />
          )
        },
      },
      //类型
      {
        title: t('TYPE'),
        dataIndex: 'type',
        isHideable: true,
        width: '15%',
        render: type => type && t(type.toUpperCase()),
      },
      //服务
      {
        title: t('SERVICE'),
        dataIndex: 'serviceName',
        isHideable: true,
        width: '15%',
        render: name => {
          if (name) {
            return <Link to={`./services/${name}/`}>{name}</Link>
          }
          return '-'
        },
      },
      //创建时间
      {
        title: t('CREATION_TIME_TCAP'),
        dataIndex: 'createTime',
        isHideable: true,
        width: 150,
        render: time => getLocalTime(time).format('YYYY-MM-DD HH:mm:ss'),
      },
    ]
  }
  //定义函数用于出发创建s2i构建操作
  showCreate = () => {
    // gbk
    // const { match, module, projectStore } = this.props
    const { match, module, devopsStore } = this.props
    //trigger用于出发js中定义的函数
    return this.props.trigger('imagebuilder.create', {
      module,
      projectDetail: devopsStore.detail,
      // projectDetail: projectStore.detail,
      namespace: match.params.devops,
      // namespace: match.params.namespace,
      cluster: match.params.cluster,
    })
  }
  // gbk
  getData = async ({ silent, ...params } = {}) => {
    const store = this.props.store

    silent && (store.list.silent = true)
    await store.fetchList({
      ...this.props.match.params,
      ...params,
      namespace: this.props.match.params.devops,
    })
    store.list.silent = false
  }

  //渲染页面内容，包括 Banner、Table 和列表展示相关的组件，以及相关的 props
  render() {
    const { bannerProps, tableProps } = this.props
    return (
      // gbk
      <ListPage {...this.props} getData={this.getData}>
        <Banner {...bannerProps} description={t(`IMAGE_BUILDER_DESC`)} />
        <Table
          {...tableProps}
          itemActions={this.itemActions}
          columns={this.getColumns()}
          onCreate={this.showCreate}
        />
      </ListPage>
    )
  }
}
