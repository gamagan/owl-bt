'use strict';



(function() {

  class TreeStore {
    constructor($q, $resource, $location, TreeNodeProvider, ProjectStore, TreeNodeDtoConverter, $rootScope, Tree, TreeNode, MissingNodeItemDescValidation) {
      this.treePath = $location.search().path;
      this.version = 1;

      this.isLoaded = false;
      this.rootNode = null;
      this._treeResource = $resource('api/tree?path=:treePath', {
        treePath: '@treePath'
      });
      this._$q = $q;
      this._TreeNodeProvider = TreeNodeProvider;
      this._ProjectStore = ProjectStore;
      this._TreeNodeDtoConverter = TreeNodeDtoConverter;
      this._Tree = Tree;
      this._TreeNode = TreeNode;
      this._$rootScope = $rootScope;
      this._MissingNodeItemDescValidation = MissingNodeItemDescValidation;

      $rootScope.$watch(() => ProjectStore.version, () => this._handlePrjReload());
    }

    load() {
      if (this._loadPromise) {
        return this._loadPromise;
      }

      let _this = this;

      let treeResourcePromise = this._treeResource.get({
        treePath: this.treePath
      }).$promise;
      let prjPromise = this._ProjectStore.load();

      this._loadPromise = this._$q.all([treeResourcePromise, prjPromise])
        .then(data => {
          let treeData = data[0];
          _this.rootNode = _this._TreeNodeProvider.create(treeData);
          this.isLoaded = true;

          _this._MissingNodeItemDescValidation.check(_this.rootNode);
        });

      return this._loadPromise;
    }

    save() {
      if (!this.isLoaded) {
        throw new Error('Unable to save before load');
      }

      let dto = this._TreeNodeDtoConverter.convert(this.rootNode);
      let resource = new this._treeResource(dto);
      return resource.$save({
        treePath: this.treePath
      }).$promise;
    }

    updateVersion() {
      if (this.version === Number.MAX_SAFE_INTEGER) {
        this.version = 1;
      } else {
        this.version++;
      }
    }

    _handlePrjReload() {
      let _this = this;
      if (this.isLoaded) {
        this._Tree.forEachNode(this.rootNode, node => {
          node.$meta.desc = _this._ProjectStore.getNodeTypeDesc(node.type);
          _this._TreeNode.updateVersion(node);

          if(node.decorators){
            for (let dec of node.decorators) {
              dec.$meta.desc = _this._ProjectStore.getDecoratorTypeDesc(dec.type);
            }
          }
          if(node.services){
            for (let svc of node.services) {
              svc.$meta.desc = _this._ProjectStore.getServiceTypeDesc(svc.type);
            }
          }
        });
        this.updateVersion();
        this._MissingNodeItemDescValidation.check(this.rootNode);
      }
    }
  }

  angular.module('editorApp')
    .service('TreeStore', TreeStore);
})();
