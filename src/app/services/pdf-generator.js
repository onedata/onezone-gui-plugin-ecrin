/**
 * Loads PDF generating library and creates PDF documents from passed search results.
 *
 * @module services/pdf-generator
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';
import { resolve, Promise } from 'rsvp';
import { getProperties, get } from '@ember/object';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';
import _ from 'lodash';

const scriptsToLoad = [
  'assets/pdfmake/pdfmake.min.js',
  'assets/pdfmake/vfs_fonts.js',
];

export default Service.extend(I18n, {
  /**
   * @override
   */
  i18nPrefix: 'services.pdfGenerator',

  /**
   * @type {pdfMake}
   */
  pdfMake: null,

  /**
   * @type {Promise<pdfMake>}
   */
  loadingPdfMakePromise: null,

  /**
   * @returns {Promise<pdfMake>}
   */
  loadPdfMake() {
    const {
      loadingPdfmakePromise,
      pdfMake,
    } = this.getProperties('loadingPdfmakePromise', 'pdfMake');

    if (pdfMake) {
      return resolve(pdfMake);
    } else if (loadingPdfmakePromise) {
      return loadingPdfmakePromise;
    } else if (window.pdfMake) {
      this.set('pdfMake', window.pdfMake);
      return resolve(window.pdfMake);
    } else {
      return this.set(
        'loadingPdfmakePromise',
        new Promise((resolve, reject) =>
          this.loadChainedLibs(scriptsToLoad, resolve, reject)
        )
      );
    }
  },

  /**
   * Loads scripts specified by first arguments one after another (second is getting
   * loaded only when the first one finished and so on).
   * @param {Array<string>} scriptsToLoad paths to scripts, that should be loaded
   * @param {Function} resolveLoad resolve promise callback. Should get makePdf
   *   as an argument
   * @param {Function} rejectLoad reject promise callback
   * @returns {undefined}
   */
  loadChainedLibs(scriptsToLoad, resolveLoad, rejectLoad) {
    const nextScript = scriptsToLoad[0];
    const scriptNode = document.createElement('script');
    scriptNode.src = nextScript;
    scriptNode.addEventListener('load', () => {
      if (scriptsToLoad.length > 1) {
        this.loadChainedLibs(scriptsToLoad.slice(1), resolveLoad, rejectLoad);
      } else {
        resolveLoad(window.pdfMake);
      }
    });
    scriptNode.addEventListener('error', event => {
      console.error('Cannot load makepdf library:', event);
      rejectLoad(this.t('cannotLoadLibraryError'));
    });
    document.getElementsByTagName('body')[0].appendChild(scriptNode);
  },

  /**
   * Generates PDF documents from passed data store
   * @param {Array<Utils.DataStore>} dataStore
   * @returns {Promise}
   */
  generatePdfFromResults(dataStore) {
    return this.loadPdfMake()
      .then(pdfMake => {
        const {
          filteredDataObjects,
          filteredStudies,
        } = getProperties(dataStore, 'filteredDataObjects', 'filteredStudies');
        const dataObjectsRepresentation =
          this.generateDataObjectsPdfRepresentation(filteredDataObjects);
        const studiesRepresentation = this.generateStudiesPdfRepresentation(
          filteredStudies,
          dataObjectsRepresentation
        );
        const docDefinition = {
          footer: function (currentPage) {
            const onRightSide = Boolean(currentPage % 2);
            return [{
              text: currentPage.toString(),
              alignment: onRightSide ? 'right' : 'left',
              fontSize: 9,
              margin: onRightSide ? [0, 10, 40, 0] : [40, 10, 0, 0],
            }];
          },
          content: [{
              text: this.pdfT('title').string,
              fontSize: 25,
            },
            ...studiesRepresentation,
          ],
          styles: {
            studyTable: {
              margin: [0, 5, 0, 15],
              fontSize: 9,
            },
          },
        };
        return pdfMake.createPdf(docDefinition).download();
      });
  },

  /**
   * Generates map dataObject.id -> dataObject pdf representation object
   * @param {Array<Utils.DataObject>} dataObjects 
   * @returns {Map<number,Object>}
   */
  generateDataObjectsPdfRepresentation(dataObjects) {
    const representationsMap = new Map();

    dataObjects.forEach(dataObject => {
      const {
        id,
        type,
        title,
        year,
        accessType,
        accessDetails,
        accessDetailsUrl,
        urls,
      } = getProperties(
        dataObject,
        'id',
        'type',
        'title',
        'year',
        'accessType',
        'accessDetails',
        'accessDetailsUrl',
        'urls'
      );

      let accessSection = [];
      if (urls.length) {
        accessSection.push({
          text: '\n' + this.pdfT('dataObjectUrlAccessLabel'),
          bold: true,
        }, {
          ul: urls.map(({ type, url }) => {
            const label = type !== 'unknown' ?
              this.pdfT(`dataObjectUrlType.${type}`) + ': ' : '';
            return label + url;
          }),
        });
      }

      let accessDetailsSection = [];
      if (accessDetails) {
        accessDetailsSection.push({
          text: '\n' + this.pdfT('dataObjectAccessDetailsLabel'),
          bold: true,
        }, accessDetails);
        if (accessDetailsUrl) {
          accessDetailsSection.push(
            ` (${this.pdfT('dataObjectAccessDetailsUrlLabel')}${accessDetailsUrl})`
          );
        }
      }

      if (!representationsMap.has(id)) {
        representationsMap.set(id, [{
          text: get(type, 'name'),
          bold: true,
        }, {
          stack: [
            title,
            { stack: accessSection },
            { text: accessDetailsSection },
          ],
        }, {
          text: year || '‐',
        }, {
          text: get(accessType, 'name') || '‐',
        }]);
      }
    });

    return representationsMap;
  },

  /**
   * Generates array of studies pdf representations
   * @param {Array<Utils.Study>} studies
   * @param {Map<number,Object>} dataObjectsRepresentation 
   * @returns {Array<Object>}
   */
  generateStudiesPdfRepresentation(studies, dataObjectsRepresentation) {
    return studies.map(study => {
      const {
        title,
        description,
        dataSharingStatement,
        dataObjects,
      } = getProperties(
        study,
        'title',
        'description',
        'dataSharingStatement',
        'dataObjects',
      );
      const tableColsCount = 4;
      const tableBody = [
        [{
          text: title,
          colSpan: tableColsCount,
          bold: true,
        }, ..._.times(tableColsCount - 1, _.constant({}))],
      ];
      if (description) {
        tableBody.push([{
          text: [{
              text: this.pdfT('studyDescriptionLabel'),
              bold: true,
            },
            description,
          ],
          colSpan: tableColsCount,
        }, ..._.times(tableColsCount - 1, _.constant({}))]);
      }
      if (dataSharingStatement) {
        tableBody.push([{
          text: [{
              text: this.pdfT('studyDataSharingStatementLabel'),
              bold: true,
            },
            dataSharingStatement,
          ],
          colSpan: tableColsCount,
        }, ..._.times(tableColsCount - 1, _.constant({}))]);
      }
      if (get(dataObjects, 'length')) {
        tableBody.push(...dataObjects.sortBy('year').map(dataObject =>
          dataObjectsRepresentation.get(get(dataObject, 'id'))
        ).compact().map(dataObject => _.cloneDeep(dataObject)));
      }

      return {
        style: 'studyTable',
        table: {
          headerRows: 1,
          keepWithHeaderRows: true,
          widths: [100, '*', 40, 80],
          body: tableBody,
        },
      };
    });
  },

  pdfT(path, ...args) {
    return this.t(`pdfElements.${path}`, ...args);
  },
});
