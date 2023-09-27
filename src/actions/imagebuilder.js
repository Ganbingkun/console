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

import { toJS } from 'mobx'
import { Notify } from '@kube-design/components'
import { Modal } from 'components/Base'

import CreateModal from 'components/Modals/Create'
import RerunModal from 'components/Forms/ImageBuilder/RerunForm'
import FORM_TEMPLATES from 'utils/form.templates'
import formPersist from 'utils/form.persist'
import FORM_STEPS from 'configs/steps/imagebuilder'
import { get, isEmpty, isArray, set } from 'lodash'

const filterImageEnv = (data, fn) => {
  let environment = get(data, 'spec.config.environment')
  if (isArray(environment)) {
    environment = environment.filter(v => fn(v))
  }
  return environment
}

export default {
  //当触发 'imagebuilder.create' 操作时，会打开一个模态框（弹窗），显示一个创建图像构建的表单。
  'imagebuilder.create': {
    on({ store, cluster, namespace, module, success, ...props }) {
      //获取 formTemplate：根据模块（module）获取表单模板。
      const formTemplate = FORM_TEMPLATES[module]({
        namespace,
      })
      //通过 Modal.open 打开模态框，传入一系列属性设置
      const modal = Modal.open({
        //用户点击模态框中的确认按钮后执行的操作
        onOk: data => {
          if (!data) {
            return
          }

          const environment = filterImageEnv(data, v => !isEmpty(v))
          set(data, 'spec.config.environment', environment)
          //确认按钮点击后，关闭，显示成功，清除表单数据
          store.create(data, { cluster, namespace }).then(() => {
            Modal.close(modal)
            Notify.success({ content: t('CREATE_SUCCESSFUL') })
            success && success()
            formPersist.delete(`${module}_create_form`)
          })
        },
        module,
        cluster,
        namespace,
        name: 'IMAGE_BUILDER',
        formTemplate,
        steps: FORM_STEPS,
        modal: CreateModal,
        noCodeEdit: true,
        store,
        ...props,
      })
    },
  },
  //当触发 'imagebuilder.rerun' 操作时
  'imagebuilder.rerun': {
    //打开一个模态框，显示一个重新运行图像构建的表单
    on({ store, detail, success, ...props }) {
      const modal = Modal.open({
        onOk: data => {
          const environment = filterImageEnv(data, v => !isEmpty(v))
          set(data, 'spec.config.environment', environment)
          store.updateBuilder(data, detail).then(() => {
            Modal.close(modal)
            success && success()
          })
        },
        detail: toJS(detail._originData),
        modal: RerunModal,
        cluster: detail.cluster,
        namespace: detail.namespace,
        store,
        ...props,
      })
    },
  },
}
